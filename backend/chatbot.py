"""
chatbot.py — ChatbotManager using Gemini 2.5 Flash + FAISS
"""

import asyncio
import nest_asyncio
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA

# Patch the event loop so Google's async client works inside Streamlit's thread
nest_asyncio.apply()
try:
    loop = asyncio.get_event_loop()
except RuntimeError:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

FAISS_PATH = "./faiss_index"


class ChatbotManager:
    def __init__(self, google_api_key: str, top_k: int = 4):
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=google_api_key,
        )

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=google_api_key,
            temperature=0.3,
        )

        self.db = FAISS.load_local(
            FAISS_PATH,
            self.embeddings,
            allow_dangerous_deserialization=True,
        )

        self.retriever = self.db.as_retriever(
            search_type="similarity",
            search_kwargs={"k": top_k},
        )

        # Balanced prompt — grounded in context but allows reasoning across chunks
        prompt_template = """You are a retrieval-augmented AI assistant.
        Your task is to answer the user's question using the provided context.
        Guidelines:
        1. The context is retrieved from documents and may appear in multiple chunks.
        2. Carefully read and combine relevant information from all chunks before answering.
        3. Base your answer strictly on the provided context.
        4. If reasoning, analysis, rating, or summarization is required, synthesize the information across chunks.
        5. If the context provides partial information, answer using what is available and state any limitations.
        6. If the answer cannot be found in the context, clearly say: "The provided context does not contain this information."
        Return a clear, factual, and structured response.

Context:
{context}

Question: {question}

Answer:"""

        self.prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"],
        )

        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.retriever,
            return_source_documents=True,
            chain_type_kwargs={"prompt": self.prompt},
            verbose=False,
        )

    def get_response(self, query: str) -> str:
        result = self.qa_chain.invoke({"query": query})
        answer = result["result"]
        sources = result.get("source_documents", [])
        if sources:
            source_info = "\n\n---\n📎 **Sources used:**\n"
            for i, doc in enumerate(sources, 1):
                preview = doc.page_content[:120].replace("\n", " ")
                source_info += f"{i}. {preview}...\n"
            return answer + source_info
        return answer