# Customer Support AI Triage
## 📌 Overview
Customer Support AI Triage is an AI-powered application designed to help customer support teams analyze and categorize customer queries efficiently.
The application receives a customer query, identifies the type of issue, retrieves relevant information from the support knowledge base, and provides an AI-assisted response.
The project consists of a React frontend and a Flask backend integrated with an AI model.

---

## 🎯 Objective

The main objective of this project is to automate the initial customer support triage process.

The system helps to:

- Understand customer queries
- Classify customer issues
- Identify the appropriate support category
- Retrieve relevant information from support documents
- Generate AI-assisted support responses
- Reduce manual effort for support teams
- Improve customer response time

---

## ✨ Features

### Customer Query Processing

Users can enter their customer support questions or issues through the application.

### Issue Classification

The system analyzes the customer query and classifies it into a relevant support category.

Example categories include:

- Account and Access
- Billing
- Technical Support
- General Customer Support

### AI-Assisted Responses

The application uses AI to analyze the customer query and provide relevant support assistance.

### Knowledge Base

The application uses support documents as a knowledge source.

The project includes:

- Account and Access information
- Billing information
- Customer Support FAQ
- Technical Support information

### RAG-Based Information Retrieval

The application uses a retrieval-based approach to find relevant information from the available support knowledge base before generating the response.

### Web Application

The frontend provides a simple interface for submitting customer queries and viewing the results.

### Automated Testing

The project includes test cases to verify the customer support triage functionality.

---

## 🏗️ Architecture

```text
                    Customer
                       |
                       v
              +----------------+
              | React Frontend |
              |     + Vite     |
              +-------+--------+
                      |
                      | HTTP Request
                      v
              +----------------+
              | Flask Backend  |
              +-------+--------+
                      |
              +-------+--------+
              |                |
              v                v
      +---------------+  +---------------+
      | Classification|  | Knowledge     |
      |    Module     |  | Base / RAG    |
      +-------+-------+  +-------+-------+
              |                  |
              +--------+---------+
                       |
                       v
                +-------------+
                | AI / Gemini |
                +------+------+
                       |
                       v
                Triage Result
                       |
                       v
                React Frontend
🛠️ Technologies Used
Frontend
React.js
Vite
JavaScript
HTML5
CSS3
Backend
Python
Flask
REST API
AI
Google Gemini API
Testing
Python
Test scripts
Tools
Git
GitHub
Visual Studio Code
Postman
📂 Project Structure
customer-support-triage-ai/
│
├── backend/
│   │
│   ├── app.py
│   ├── classifier.py
│   ├── config.py
│   ├── rag_engine.py
│   ├── requirements.txt
│   │
│   ├── account_access.txt
│   ├── billing.txt
│   ├── customer_support_faq.txt
│   └── technical_support.txt
│
├── frontend/
│   │
│   ├── public/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── test_triage.py
├── README.md
└── .gitignore
🔧 Backend Components
app.py
app.py is the main Flask application.
It is responsible for:
Starting the backend server
Handling API requests
Receiving customer queries
Processing requests
Returning results to the frontend
classifier.py
classifier.py is responsible for analyzing customer queries and identifying the appropriate support category.
rag_engine.py
rag_engine.py handles the retrieval and AI-assisted processing of information from the support knowledge base.
config.py
config.py contains application configuration.
Sensitive information such as API keys should be stored securely using environment variables.
📚 Knowledge Base
The application uses support documents to provide relevant information.
Account and Access
Contains information related to:
Login problems
Account access
Account-related issues
Billing
Contains information related to:
Billing questions
Payments
Billing-related problems
Customer Support FAQ
Contains frequently asked customer support questions and their relevant information.
Technical Support
Contains information related to:
Technical problems
Troubleshooting
Technical support queries
🔄 Application Workflow
1. User enters a customer query
              |
              v
2. React frontend receives the query
              |
              v
3. Query is sent to Flask backend
              |
              v
4. Backend analyzes the query
              |
              v
5. Query is classified
              |
              v
6. Relevant knowledge is retrieved
              |
              v
7. AI processes the query
              |
              v
8. Triage result is generated
              |
              v
9. Result is returned to frontend
              |
              v
10. User views the response
⚙️ Installation
Prerequisites
Install the following software before running the project:
Python 3.x
Node.js
npm
Git
🚀 Backend Setup
Open a terminal and navigate to the backend folder.
cd backend
Create a virtual environment:
python -m venv venv
Activate the virtual environment on Windows:
venv\Scripts\activate
Install the required packages:
pip install -r requirements.txt
🔐 Environment Variables
API keys and other sensitive credentials should not be stored directly in source code.
Use environment variables for sensitive information.
Example:
GOOGLE_API_KEY=your_api_key_here
Do not upload real API keys, passwords, or tokens to GitHub.
▶️ Run Backend
From the backend folder:
python app.py
The Flask server runs locally at:
http://127.0.0.1:5000
🎨 Frontend Setup
Open another terminal.
Navigate to the frontend folder:
cd frontend
Install the dependencies:
npm install
▶️ Run Frontend
Start the React development server:
npm run dev
The application will be available at the local URL shown by Vite, usually:
http://localhost:5173
Open the URL in your browser.
🧪 Testing
The project contains a test file:
test_triage.py
Run the test using:
python test_triage.py
The test verifies the customer support triage functionality.
🔌 API Communication
The frontend communicates with the Flask backend through HTTP requests.
React Frontend
      |
      | HTTP Request
      v
Flask REST API
      |
      v
Query Processing
      |
      v
Classification
      |
      v
Knowledge Retrieval
      |
      v
AI Processing
      |
      v
Response
      |
      v
React Frontend
🤖 AI and RAG
The application combines AI processing with a project-specific knowledge base.
The general process is:
Customer Query
      |
      v
Query Analysis
      |
      v
Relevant Information Retrieval
      |
      v
Context + Query
      |
      v
AI Model
      |
      v
Support Response
This approach helps the system provide responses based on the available customer support information.
🔒 Security
The following security practices should be followed:
Never commit API keys to GitHub
Never commit passwords
Never commit authentication tokens
Store secrets using environment variables
Use .gitignore for sensitive files
Do not commit Python cache files
Do not commit unnecessary generated files
Recommended .gitignore entries:
.env
venv/
__pycache__/
*.pyc
node_modules/
dist/
📈 Future Enhancements
Possible future improvements include:
User authentication
Ticket management
Ticket priority prediction
Sentiment analysis
Automatic ticket assignment
Customer conversation history
Human agent handoff
Analytics dashboard
Email integration
Database integration
Multi-language support
Cloud deployment
💡 Benefits
The application can help customer support teams by:
Reducing manual query classification
Improving response time
Finding relevant information faster
Automating the initial support triage process
Assisting support agents with AI
Providing a centralized support workflow
📋 Example
Customer Query
I am unable to access my account.
Processing
Customer Query
      ↓
Query Classification
      ↓
Account and Access
      ↓
Retrieve Relevant Information
      ↓
AI-Assisted Response
Result
The system identifies the query as an account/access-related issue and provides relevant support information.
📌 Project Highlights
This project demonstrates practical experience with:
Full-stack web development
React.js
Flask
REST APIs
Python
AI integration
Google Gemini API
Knowledge-base retrieval
Query classification
RAG-based processing
Automated testing
Git and GitHub
📄 Project Status
Project: Customer Support AI Triage
Status: Completed for assessment submission
👩‍💻 Author
Lakshmi Tulasi
GitHub:
https://github.com/lakshmitulasi18⁠�
⭐ Conclusion
Customer Support AI Triage demonstrates how artificial intelligence, knowledge-base retrieval, and full-stack web technologies can be combined to automate and improve the initial customer support process.

**Idi complete README.** ✅

Ippudu **motham copy → GitHub README edit → Ctrl+A → paste → Commit changes** cheyyi.

**Note:** `https://github.com/lakshmitulasi18` ni nenu screenshot lo kanipinchina username base meeda pettanu. Repo name `customer-support-triage-ai` kabatti GitHub profile link correct ga undali.
