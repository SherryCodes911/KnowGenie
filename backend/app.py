"""
app.py — Document Buddy App (Gemini 2.5 Edition)
"""

import os
import base64
import streamlit as st
from vectors import EmbeddingsManager
from chatbot import ChatbotManager

st.set_page_config(
    page_title="Document Buddy — Gemini 2.5",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Session State Init ───────────────────────────────────────────────────────
for key, default in [
    ("temp_file_path", None),
    ("chatbot_manager", None),
    ("messages", []),
    ("embeddings_done", False),
    ("api_key", ""),
]:
    if key not in st.session_state:
        st.session_state[key] = default

# ─── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("📚 Document Buddy")
    st.markdown("**Powered by Gemini 2.5 Flash**")
    st.markdown("---")

    api_key_input = st.text_input(
        "🔑 Google API Key",
        type="password",
        placeholder="Paste your API key here",
        value=st.session_state["api_key"],
    )
    # Persist API key in session so it survives reruns
    if api_key_input:
        st.session_state["api_key"] = api_key_input

    st.markdown("---")
    menu = ["🏠 Home", "🤖 Chatbot"]
    choice = st.radio("Navigate", menu)

# ─── Home ─────────────────────────────────────────────────────────────────────
if choice == "🏠 Home":
    st.title("📄 Document Buddy — Gemini 2.5 Edition")
    st.markdown("""
    Welcome! This app lets you chat with your documents using **Gemini 2.5 Flash**.

    **Supported formats:** PDF, TXT, CSV

    **Steps:**
    1. Enter your Google API Key in the sidebar
    2. Upload a file in the Chatbot tab
    3. Click **Create Embeddings**
    4. Chat!
    """)

# ─── Chatbot ──────────────────────────────────────────────────────────────────
elif choice == "🤖 Chatbot":
    st.title("🤖 Chat with Your Document")

    if not st.session_state["api_key"]:
        st.warning("⚠️ Please enter your Google API Key in the sidebar.")
        st.stop()

    col1, col2, col3 = st.columns([1, 1, 1])

    # ── Column 1: Upload ──
    with col1:
        st.header("📂 Upload File")
        uploaded_file = st.file_uploader("Upload PDF, TXT, or CSV", type=["pdf", "txt", "csv"])

        if uploaded_file:
            ext = os.path.splitext(uploaded_file.name)[-1].lower()
            temp_path = f"temp_upload{ext}"

            # Only re-save if it's a new file
            if st.session_state["temp_file_path"] != temp_path:
                with open(temp_path, "wb") as f:
                    f.write(uploaded_file.getbuffer())
                st.session_state["temp_file_path"] = temp_path
                st.session_state["embeddings_done"] = False
                st.session_state["chatbot_manager"] = None
                st.session_state["messages"] = []

            st.success(f"✅ {uploaded_file.name} ({uploaded_file.size} bytes)")

            if ext == ".pdf":
                uploaded_file.seek(0)
                b64 = base64.b64encode(uploaded_file.read()).decode("utf-8")
                st.markdown(
                    f'<iframe src="data:application/pdf;base64,{b64}" '
                    f'width="100%" height="400" type="application/pdf"></iframe>',
                    unsafe_allow_html=True,
                )
            elif ext in [".txt", ".csv"]:
                with open(temp_path, "r", encoding="utf-8", errors="replace") as f:
                    preview = f.read(1000)
                st.text_area("📄 Preview", preview, height=200)

    # ── Column 2: Embeddings ──
    with col2:
        st.header("🧠 Embeddings")

        if st.button("⚙️ Create Embeddings", use_container_width=True):
            if not st.session_state["temp_file_path"]:
                st.warning("⚠️ Upload a file first.")
            else:
                try:
                    mgr = EmbeddingsManager(google_api_key=st.session_state["api_key"])
                    with st.spinner("🔄 Embedding your document..."):
                        result = mgr.create_embeddings(st.session_state["temp_file_path"])
                    st.success(result)

                    # Init chatbot and store in session state
                    st.session_state["chatbot_manager"] = ChatbotManager(
                        google_api_key=st.session_state["api_key"]
                    )
                    st.session_state["embeddings_done"] = True

                except Exception as e:
                    st.error(f"❌ Error: {e}")

        if st.session_state["embeddings_done"]:
            st.info("✅ Embeddings ready — go chat!")

    # ── Column 3: Chat ──
    with col3:
        st.header("💬 Chat")

        if not st.session_state["chatbot_manager"]:
            st.info("Upload a file and create embeddings first.")
        else:
            for msg in st.session_state["messages"]:
                st.chat_message(msg["role"]).markdown(msg["content"])

            if user_input := st.chat_input("Ask a question about your document..."):
                st.chat_message("user").markdown(user_input)
                st.session_state["messages"].append({"role": "user", "content": user_input})

                with st.spinner("🤖 Thinking..."):
                    try:
                        answer = st.session_state["chatbot_manager"].get_response(user_input)
                    except Exception as e:
                        answer = f"❌ Error: {e}"

                st.chat_message("assistant").markdown(answer)
                st.session_state["messages"].append({"role": "assistant", "content": answer})