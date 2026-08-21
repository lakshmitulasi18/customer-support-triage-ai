import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Define a dataset for training the classifier
TRAINING_DATA = [
    # Billing
    ("I want to cancel my subscription", "Billing"),
    ("How do I update my credit card?", "Billing"),
    ("Why was I charged twice this month?", "Billing"),
    ("Can I get a refund for my last invoice?", "Billing"),
    ("What are your pricing tiers?", "Billing"),
    ("How do I upgrade to the pro plan?", "Billing"),
    ("Where can I download my PDF invoice?", "Billing"),
    ("My payment failed yesterday, what should I do?", "Billing"),
    ("How much does the enterprise plan cost?", "Billing"),
    ("I see a pending charge that I don't recognize", "Billing"),
    ("Is there a discount for annual billing?", "Billing"),
    ("I need to change my billing cycle from monthly to yearly", "Billing"),
    
    # Technical Support
    ("The app keeps crashing when I upload a file", "Technical Support"),
    ("I am getting a 500 error on the dashboard", "Technical Support"),
    ("The API integration is failing with status 401", "Technical Support"),
    ("Why is the loading time so slow?", "Technical Support"),
    ("How do I set up the SDK in Node.js?", "Technical Support"),
    ("The website is not loading on Chrome", "Technical Support"),
    ("Is there a bug in the file upload feature?", "Technical Support"),
    ("I need help debugging a connection error", "Technical Support"),
    ("The application is freezing when I click save", "Technical Support"),
    ("My API request is returning a 429 rate limit error", "Technical Support"),
    ("What are the system requirements for this software?", "Technical Support"),
    ("The dashboard is blank after I reload the page", "Technical Support"),
    
    # Account Access
    ("I forgot my password", "Account Access"),
    ("How do I reset my security questions?", "Account Access"),
    ("I am locked out of my account", "Account Access"),
    ("I am not receiving the 2FA code", "Account Access"),
    ("How do I change my email address?", "Account Access"),
    ("Can you help me unlock my username?", "Account Access"),
    ("I cannot login with my credentials", "Account Access"),
    ("How do I enable two-factor authentication?", "Account Access"),
    ("My account was suspended, how do I reactivate it?", "Account Access"),
    ("I need to update my recovery phone number", "Account Access"),
    ("The password reset link has expired", "Account Access"),
    ("Where do I go to change my profile details?", "Account Access")
]

class TriageClassifier:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(lowercase=True, stop_words="english", ngram_range=(1, 2))
        self.model = LogisticRegression(C=1.0, max_iter=200)
        self.categories = ["Billing", "Technical Support", "Account Access"]
        self.train()

    def train(self):
        texts, labels = zip(*TRAINING_DATA)
        X = self.vectorizer.fit_transform(texts)
        self.model.fit(X, labels)

    def predict(self, text):
        if not text or not text.strip():
            return "Billing", 0.0, {cat: 0.0 for cat in self.categories}
        
        X = self.vectorizer.transform([text])
        probs = self.model.predict_proba(X)[0]
        
        # Map probabilities to categories
        prob_dict = {self.model.classes_[i]: float(probs[i]) for i in range(len(self.model.classes_))}
        
        # Get the top class
        predicted_idx = np.argmax(probs)
        predicted_class = self.model.classes_[predicted_idx]
        confidence = float(probs[predicted_idx])
        
        return predicted_class, confidence, prob_dict

# Singleton instance
classifier_instance = TriageClassifier()

def classify_message(text):
    return classifier_instance.predict(text)
