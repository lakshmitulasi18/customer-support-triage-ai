import os
import re
import requests
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import google.generativeai as genai
from config import load_config

KB_DIR = os.path.join(os.path.dirname(__file__), "knowledge_base")

class RAGEngine:
    def __init__(self):
        self.chunks = []       # list of dicts: {"text": str, "source": str}
        self.vectorizer = None # TfidfVectorizer
        self.X_kb = None       # TF-IDF matrix for KB chunks
        self.reload_kb()

    def reload_kb(self):
        """Loads and indexes knowledge base files."""
        self.chunks = []
        if not os.path.exists(KB_DIR):
            os.makedirs(KB_DIR, exist_ok=True)
            return

        for filename in os.listdir(KB_DIR):
            if filename.endswith(".txt"):
                filepath = os.path.join(KB_DIR, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Split document into sections/paragraphs
                # We split by empty lines or markdown headers
                paragraphs = re.split(r'\n\s*\n', content)
                current_section = ""
                
                for para in paragraphs:
                    para = para.strip()
                    if not para:
                        continue
                    
                    # Track headers to give context to chunks
                    if para.startswith("#"):
                        current_section = para.split("\n")[0].replace("#", "").strip()
                    
                    # Append paragraph with metadata
                    text_with_context = para
                    if current_section and not para.startswith("#"):
                        text_with_context = f"[{current_section}] {para}"
                        
                    self.chunks.append({
                        "text": text_with_context,
                        "raw_text": para,
                        "source": filename,
                        "section": current_section
                    })

        if self.chunks:
            self.vectorizer = TfidfVectorizer(lowercase=True, stop_words="english")
            texts = [c["text"] for c in self.chunks]
            self.X_kb = self.vectorizer.fit_transform(texts)
        else:
            self.vectorizer = None
            self.X_kb = None

    def retrieve(self, query):
        """Retrieves the most relevant chunk for a query using cosine similarity."""
        if not self.chunks or self.vectorizer is None:
            return None, 0.0

        query_vec = self.vectorizer.transform([query])
        similarities = cosine_similarity(query_vec, self.X_kb)[0]
        
        best_idx = np.argmax(similarities)
        best_score = float(similarities[best_idx])
        
        return self.chunks[best_idx], best_score

    def generate_answer(self, query, context_chunk, config):
        """Generates grounded answer based on query, context, and configurations."""
        provider = config.get("llm_provider", "local")
        context_text = context_chunk["raw_text"]
        source_doc = context_chunk["source"]

        system_instruction = (
            "You are a Tier-1 Customer Support AI Employee. "
            "Answer the customer's question grounded strictly in the provided context. "
            "Do not extrapolate or mention facts not in the context. "
            "Keep the response polite, helpful, and concise. "
            f"Always cite the source document [{source_doc}] at the end of the answer."
        )

        prompt = (
            f"Context from knowledge base ({source_doc}):\n"
            f"-------------------\n"
            f"{context_text}\n"
            f"-------------------\n"
            f"Customer Question: {query}\n"
            f"Support Answer:"
        )

        # Gemini Provider
        if provider == "gemini" and config.get("gemini_api_key"):
            try:
                genai.configure(api_key=config["gemini_api_key"])
                model = genai.GenerativeModel(
                    "gemini-1.5-flash",
                    system_instruction=system_instruction
                )
                response = model.generate_content(prompt)
                return response.text.strip()
            except Exception as e:
                # Fallback to local on error
                return f"[API Error: Falling back to Local Extractive Answer] {self._local_extractive_answer(query, context_chunk)}"

        # OpenAI Provider
        elif provider == "openai" and config.get("openai_api_key"):
            try:
                headers = {
                    "Authorization": f"Bearer {config['openai_api_key']}",
                    "Content-Type": "application/json"
                }
                data = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.2
                }
                res = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data, timeout=10)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"].strip()
                else:
                    return f"[API Error {res.status_code}: Falling back to Local Extractive Answer] {self._local_extractive_answer(query, context_chunk)}"
            except Exception:
                return f"[API Timeout: Falling back to Local Extractive Answer] {self._local_extractive_answer(query, context_chunk)}"

        # Default Local Extractive Generator
        return self._local_extractive_answer(query, context_chunk)

    def _local_extractive_answer(self, query, context_chunk):
        """A simple local extractive RAG summary that works offline without API keys."""
        raw_text = context_chunk["raw_text"]
        source = context_chunk["source"]
        
        # Split chunk into lines/sentences
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+|\n', raw_text) if s.strip()]
        
        if not sentences:
            return f"According to our {source} guidelines: {raw_text}"
            
        # Run a small mini TF-IDF match of sentences against query to extract the most relevant ones
        query_words = set(re.findall(r'\w+', query.lower()))
        scores = []
        for sent in sentences:
            # Clean headers or lists
            clean_sent = re.sub(r'^\s*[-*#\d\.]+\s*', '', sent)
            sent_words = set(re.findall(r'\w+', clean_sent.lower()))
            overlap = len(query_words.intersection(sent_words))
            scores.append(overlap)
            
        max_idx = np.argmax(scores)
        best_sentence = sentences[max_idx]
        
        # Assemble a nice grounded response
        formatted_source = source.replace(".txt", "").replace("_", " ").title()
        
        # If it looks like a list item or title, include the surrounding content
        answer_lines = []
        # If there's a heading in the chunk, grab it
        heading_match = re.match(r'^(#+\s+.*|.*Policies|.*Guide|.*Security Guide)', raw_text)
        if heading_match:
            answer_lines.append(f"Section: {heading_match.group(0)}")
            
        answer_lines.append(f"Grounded Info: \"{best_sentence}\"")
        answer_lines.append(f"(Details retrieved from {source})")
        
        return "\n\n".join(answer_lines)

# Singleton instance
rag_instance = RAGEngine()

def get_rag_engine():
    return rag_instance
