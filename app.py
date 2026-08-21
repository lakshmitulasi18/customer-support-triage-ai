import os
import json
import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import load_config, save_config
from classifier import classify_message
from rag_engine import get_rag_engine, KB_DIR

app = Flask(__name__)
CORS(app) # Enable CORS for frontend

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "data", "chat_history.json")

def load_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []

def save_history(history):
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=4)

@app.route("/api/triage", methods=["POST"])
def triage():
    data = request.get_json() or {}
    message = data.get("message", "").strip()
    
    if not message:
        return jsonify({"error": "Empty message"}), 400

    config = load_config()
    rag_engine = get_rag_engine()
    
    # 1. Classification
    category, class_conf, class_probs = classify_message(message)
    
    # 2. Document Retrieval
    retrieved_chunk, rel_score = rag_engine.retrieve(message)
    
    # Determine escalation conditions
    escalated = False
    escalation_reason = ""
    
    class_threshold = config["classification_threshold"]
    retrieval_threshold = config["retrieval_threshold"]
    
    # Check Out of Scope
    # Out of scope is when classification confidence is extremely low and relevance is extremely low,
    # meaning it doesn't match our categories nor our knowledge base at all.
    if class_conf < class_threshold and rel_score < retrieval_threshold:
        escalated = True
        escalation_reason = "Escalated because the query is out-of-scope and matches no supported categories or knowledge base articles."
    # Check Low Confidence Classification (fits a category, but barely)
    elif class_conf < class_threshold:
        escalated = True
        escalation_reason = f"Escalated due to low categorization confidence ({class_conf:.2f} is below threshold {class_threshold:.2f})."
    # Check Low Relevance Retrieval (matches a category, but no info in KB)
    elif rel_score < retrieval_threshold:
        escalated = True
        escalation_reason = "Escalated because no sufficiently relevant information was found in the knowledge base."

    answer = ""
    source_doc = None
    chunk_text = None
    
    if escalated:
        answer = "I'm sorry, I couldn't find a confident answer for your question. A human support agent has been notified and will assist you shortly."
        
        # Save to escalations queue
        history = load_history()
        ticket = {
            "id": len(history) + 1,
            "timestamp": datetime.datetime.now().isoformat(),
            "message": message,
            "predicted_category": category,
            "classification_confidence": class_conf,
            "relevance_score": rel_score,
            "escalation_reason": escalation_reason,
            "status": "Pending"
        }
        history.append(ticket)
        save_history(history)
    else:
        source_doc = retrieved_chunk["source"]
        chunk_text = retrieved_chunk["raw_text"]
        # Generate answer using RAG
        answer = rag_engine.generate_answer(message, retrieved_chunk, config)
        
    return jsonify({
        "message": message,
        "category": category,
        "classification_confidence": class_conf,
        "classification_probabilities": class_probs,
        "relevance_score": rel_score,
        "source_document": source_doc,
        "retrieved_chunk": chunk_text,
        "answer": answer,
        "escalated": escalated,
        "escalation_reason": escalation_reason
    })

@app.route("/api/config", methods=["GET", "POST"])
def manage_config():
    if request.method == "POST":
        data = request.get_json() or {}
        config = load_config()
        
        # Update settings
        if "classification_threshold" in data:
            config["classification_threshold"] = float(data["classification_threshold"])
        if "retrieval_threshold" in data:
            config["retrieval_threshold"] = float(data["retrieval_threshold"])
        if "llm_provider" in data:
            config["llm_provider"] = data["llm_provider"]
        if "gemini_api_key" in data:
            config["gemini_api_key"] = data["gemini_api_key"]
        if "openai_api_key" in data:
            config["openai_api_key"] = data["openai_api_key"]
            
        save_config(config)
        return jsonify({"message": "Configuration saved successfully", "config": config})
    else:
        config = load_config()
        # Clean api keys for security in GET response
        safe_config = config.copy()
        if safe_config.get("gemini_api_key"):
            safe_config["gemini_api_key"] = "••••" + safe_config["gemini_api_key"][-4:]
        if safe_config.get("openai_api_key"):
            safe_config["openai_api_key"] = "••••" + safe_config["openai_api_key"][-4:]
        return jsonify(safe_config)

@app.route("/api/escalations", methods=["GET"])
def get_escalations():
    return jsonify(load_history())

@app.route("/api/escalations/resolve", methods=["POST"])
def resolve_escalation():
    data = request.get_json() or {}
    ticket_id = data.get("id")
    if not ticket_id:
        return jsonify({"error": "Missing ticket id"}), 400
        
    history = load_history()
    updated = False
    for ticket in history:
        if ticket["id"] == ticket_id:
            ticket["status"] = "Resolved"
            updated = True
            break
            
    if updated:
        save_history(history)
        return jsonify({"message": f"Ticket #{ticket_id} resolved"})
    return jsonify({"error": "Ticket not found"}), 404

@app.route("/api/kb", methods=["GET"])
def get_kb():
    rag_engine = get_rag_engine()
    # List files and character length
    files = []
    for filename in os.listdir(KB_DIR):
        if filename.endswith(".txt"):
            filepath = os.path.join(KB_DIR, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            files.append({
                "name": filename,
                "length": len(content),
                "content": content
            })
    return jsonify({"files": files, "chunks_count": len(rag_engine.chunks)})

@app.route("/api/kb/upload", methods=["POST"])
def upload_kb():
    data = request.get_json() or {}
    filename = data.get("name", "").strip()
    content = data.get("content", "").strip()
    
    if not filename or not content:
        return jsonify({"error": "Name and content are required"}), 400
        
    if not filename.endswith(".txt"):
        filename += ".txt"
        
    # Standardize filename
    filename = "".join([c for c in filename if c.isalpha() or c.isdigit() or c in "._-"])
    
    filepath = os.path.join(KB_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
        
    # Reload chunks
    rag_engine = get_rag_engine()
    rag_engine.reload_kb()
    
    return jsonify({"message": f"Knowledge base file '{filename}' saved and re-indexed"})

if __name__ == "__main__":
    app.run(port=5000, debug=True)
