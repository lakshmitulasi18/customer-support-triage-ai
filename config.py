import os
import json

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "data", "config.json")

DEFAULT_CONFIG = {
    "classification_threshold": 0.45,
    "retrieval_threshold": 0.20,
    "llm_provider": "local",  # options: local, gemini, openai
    "gemini_api_key": "",
    "openai_api_key": "",
}

def load_config():
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "w") as f:
            json.dump(DEFAULT_CONFIG, f, indent=4)
        return DEFAULT_CONFIG.copy()
    
    try:
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
        # Ensure all default keys exist
        updated = False
        for k, v in DEFAULT_CONFIG.items():
            if k not in config:
                config[k] = v
                updated = True
        if updated:
            save_config(config)
        return config
    except Exception:
        return DEFAULT_CONFIG.copy()

def save_config(config):
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=4)
