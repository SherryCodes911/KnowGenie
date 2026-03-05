"""
Run: python check_models.py
Lists all models supporting both embedContent and generateContent.
"""
import urllib.request
import json

api_key = input("Paste your Google API key: ").strip()

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
with urllib.request.urlopen(url) as r:
    data = json.loads(r.read())

print("\n=== Models supporting generateContent (chat/LLM) ===")
for m in data.get("models", []):
    if "generateContent" in m.get("supportedGenerationMethods", []):
        print(" ", m["name"])

print("\n=== Models supporting embedContent (embeddings) ===")
for m in data.get("models", []):
    if "embedContent" in m.get("supportedGenerationMethods", []):
        print(" ", m["name"])