import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Settings, 
  AlertTriangle, 
  BookOpen, 
  Send, 
  Bot, 
  User, 
  CheckCircle, 
  X, 
  Upload, 
  FileText, 
  ArrowRight, 
  ShieldAlert, 
  Database,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import "./App.css";

const API_BASE = "http://127.0.0.1:5000";

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  
  // Settings state
  const [config, setConfig] = useState({
    classification_threshold: 0.55,
    retrieval_threshold: 0.20,
    llm_provider: "local",
    gemini_api_key: "",
    openai_api_key: ""
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // Escalations state
  const [escalations, setEscalations] = useState([]);
  
  // KB state
  const [kbFiles, setKbFiles] = useState([]);
  const [editorModal, setEditorModal] = useState({ open: false, name: "", content: "" });
  const [isSavingKb, setIsSavingKb] = useState(false);

  // Backend connection status
  const [backendOnline, setBackendOnline] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Expanded metadata states in chat
  const [expandedMetadata, setExpandedMetadata] = useState({});

  // Toast notifications state
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  const messagesEndRef = useRef(null);

  // Suggested test queries
  const SUGGESTED_QUERIES = [
    { text: "Can I get a refund for my invoice? I bought it 5 days ago.", label: "Scenario 1: Billing (Known)" },
    { text: "What is the maximum file size for uploads?", label: "Scenario 2: Technical Support (Known)" },
    { text: "I forgot my password, how do I reset it?", label: "Scenario 3: Account Access (Known)" },
    { text: "What is the shipping cost to Germany?", label: "Scenario 4: Not in KB (Escalates)" },
    { text: "Tell me a joke about programming.", label: "Scenario 5: Out of Scope (Escalates)" }
  ];

  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "info" });
    }, 4000);
  };

  const checkBackendStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/api/config`);
      if (res.ok) {
        setBackendOnline(true);
        // Load configurations
        const data = await res.json();
        setConfig(data);
      } else {
        setBackendOnline(false);
      }
    } catch (e) {
      setBackendOnline(false);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const fetchEscalations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/escalations`);
      if (res.ok) {
        const data = await res.json();
        // Sort descending by timestamp (newest first)
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setEscalations(data);
      }
    } catch (e) {
      console.error("Error fetching escalations:", e);
    }
  };

  const fetchKB = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/kb`);
      if (res.ok) {
        const data = await res.json();
        setKbFiles(data.files || []);
      }
    } catch (e) {
      console.error("Error fetching KB files:", e);
    }
  };

  // Perform initial loads
  useEffect(() => {
    checkBackendStatus();
  }, []);

  // Poll escalations & KB files when tabs change or on connection
  useEffect(() => {
    if (backendOnline) {
      fetchEscalations();
      fetchKB();
    }
  }, [backendOnline, activeTab]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (text) => {
    const queryText = text || inputValue;
    if (!queryText.strip && !queryText.trim()) return;

    // Clear text area
    if (!text) setInputValue("");

    // Add User Message
    const userMsg = {
      id: Date.now(),
      text: queryText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryText })
      });

      if (!res.ok) {
        throw new Error("Failed to get response from server");
      }

      const data = await res.json();
      
      const botMsg = {
        id: Date.now() + 1,
        text: data.answer,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metadata: {
          category: data.category,
          classification_confidence: data.classification_confidence,
          classification_probabilities: data.classification_probabilities,
          relevance_score: data.relevance_score,
          source_document: data.source_document,
          retrieved_chunk: data.retrieved_chunk,
          escalated: data.escalated,
          escalation_reason: data.escalation_reason
        }
      };

      setMessages(prev => [...prev, botMsg]);
      
      // Auto expand metadata if it is escalated to draw attention to the reason
      if (data.escalated) {
        setExpandedMetadata(prev => ({ ...prev, [botMsg.id]: true }));
        // Refresh escalations list
        fetchEscalations();
      }
    } catch (e) {
      const errorMsg = {
        id: Date.now() + 1,
        text: "Error connecting to triage API. Please make sure Flask backend is running on port 5000.",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch(`${API_BASE}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const data = await res.json();
        // Update state with clean response config
        setConfig(data.config);
        triggerToast("Configuration saved successfully", "success");
      } else {
        triggerToast("Failed to save configuration", "error");
      }
    } catch (e) {
      triggerToast("Error connecting to backend", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      const res = await fetch(`${API_BASE}/api/escalations/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticketId })
      });
      if (res.ok) {
        triggerToast(`Ticket #${ticketId} resolved`, "success");
        fetchEscalations();
      } else {
        triggerToast("Failed to resolve ticket", "error");
      }
    } catch (e) {
      triggerToast("Error connecting to server", "error");
    }
  };

  const handleSaveKbFile = async (e) => {
    e.preventDefault();
    if (!editorModal.name || !editorModal.content) {
      triggerToast("Please fill in file name and content", "error");
      return;
    }

    setIsSavingKb(true);
    try {
      const res = await fetch(`${API_BASE}/api/kb/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editorModal.name,
          content: editorModal.content
        })
      });
      if (res.ok) {
        triggerToast(`Saved ${editorModal.name} to knowledge base`, "success");
        setEditorModal({ open: false, name: "", content: "" });
        fetchKB();
      } else {
        triggerToast("Failed to upload document", "error");
      }
    } catch (e) {
      triggerToast("Error uploading file to server", "error");
    } finally {
      setIsSavingKb(false);
    }
  };

  const toggleMetadata = (msgId) => {
    setExpandedMetadata(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const getCategoryClass = (cat) => {
    if (!cat) return "";
    if (cat.toLowerCase().includes("billing")) return "billing";
    if (cat.toLowerCase().includes("tech")) return "tech";
    return "access";
  };

  return (
    <div className="dashboard-container">
      {/* Header Panel */}
      <header className="header-panel animate-fade-in">
        <div className="logo-section">
          <div className="logo-icon">
            <Bot size={24} />
          </div>
          <div>
            <h1>TriageCopilot</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tier-1 Customer Triage AI</p>
          </div>
          <span>v1.0.0</span>
        </div>

        <div className="system-status">
          <div className="status-badge">
            <Database size={16} />
            <span>KB Docs: <strong>{kbFiles.length}</strong></span>
          </div>
          <div className="status-badge">
            <ShieldAlert size={16} />
            <span>Pending Tickets: <strong>{escalations.filter(t => t.status === "Pending").length}</strong></span>
          </div>
          <div className="status-badge">
            <div className="status-dot" style={{ backgroundColor: backendOnline ? "var(--color-emerald)" : "var(--color-rose)", boxShadow: backendOnline ? "0 0 8px var(--color-emerald)" : "0 0 8px var(--color-rose)" }} />
            <span>Server: <strong>{backendOnline ? "Online" : "Offline"}</strong></span>
            <button className="btn-icon" onClick={checkBackendStatus} disabled={isCheckingStatus} title="Reload Server Connection" style={{ marginLeft: '0.5rem', padding: '0.2rem' }}>
              <RefreshCw size={12} className={isCheckingStatus ? "spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* Connection Warning Banner */}
      {!backendOnline && (
        <div className="escalation-alert animate-fade-in" style={{ margin: '0' }}>
          <AlertTriangle size={20} className="escalation-alert-icon" />
          <div className="escalation-alert-content">
            <h4>Backend Server Disconnected</h4>
            <p>The React UI is ready, but cannot communicate with the Flask API at <code>http://127.0.0.1:5000</code>. Please launch the backend server using the run instructions in the project root.</p>
          </div>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="main-workspace animate-fade-in">
        
        {/* Left Column: Chat Window */}
        <section className="chat-panel">
          <div className="panel-header">
            <h2>
              <MessageSquare size={20} style={{ color: 'var(--color-indigo)' }} />
              Customer Support Triage Chat
            </h2>
            <div className="panel-actions">
              <button 
                className="btn-icon" 
                onClick={() => setMessages([])} 
                title="Clear Chat Logs"
                disabled={messages.length === 0}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <Bot size={48} className="empty-chat-icon" />
                <h3>Welcome to TriageCopilot</h3>
                <p style={{ maxWidth: '400px' }}>Enter a customer support request below, or click on one of the sample scenario prompts below to test categorization, retrieval, and escalations.</p>
                
                <div className="suggested-queries">
                  {SUGGESTED_QUERIES.map((q, idx) => (
                    <button 
                      key={idx} 
                      className="suggested-btn"
                      onClick={() => handleSendMessage(q.text)}
                      disabled={!backendOnline || isLoading}
                    >
                      <div style={{ fontWeight: '700', fontSize: '0.75rem', color: 'var(--color-indigo)', marginBottom: '0.15rem' }}>{q.label}</div>
                      <div>{q.text}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`message-row ${msg.sender}`}>
                  <span className="message-sender">
                    {msg.sender === "user" ? <User size={12} /> : <Bot size={12} />}
                    {msg.sender === "user" ? "Customer" : "Triage AI"}
                    <span style={{ fontSize: '0.65rem' }}>• {msg.timestamp}</span>
                  </span>
                  
                  <div className="message-bubble">
                    {msg.text}
                  </div>

                  {/* Metadata and Analytics section */}
                  {msg.sender === "bot" && msg.metadata && (
                    <div className="metadata-collapse">
                      <div className="metadata-toggle" onClick={() => toggleMetadata(msg.id)}>
                        <span>Triage Details & Analytics</span>
                        {expandedMetadata[msg.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>

                      {expandedMetadata[msg.id] && (
                        <div className="metadata-content">
                          {/* Categorization Metric */}
                          <div className="metric-row">
                            <div className="metric-label">
                              <span>Predicted Category:</span>
                              <span className={`category-tag ${getCategoryClass(msg.metadata.category)}`}>
                                {msg.metadata.category}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span className="metric-value">
                                {(msg.metadata.classification_confidence * 100).toFixed(0)}%
                              </span>
                              <div className="metric-bar-bg">
                                <div 
                                  className="metric-bar-fill" 
                                  style={{ 
                                    width: `${msg.metadata.classification_confidence * 100}%`,
                                    backgroundColor: msg.metadata.classification_confidence >= config.classification_threshold ? 'var(--color-emerald)' : 'var(--color-rose)'
                                  }} 
                                />
                              </div>
                            </div>
                          </div>

                          {/* Retrieval Relevance Metric */}
                          <div className="metric-row">
                            <span className="metric-label">KB Relevance Match:</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span className="metric-value">
                                {(msg.metadata.relevance_score * 100).toFixed(0)}%
                              </span>
                              <div className="metric-bar-bg">
                                <div 
                                  className="metric-bar-fill" 
                                  style={{ 
                                    width: `${Math.min(msg.metadata.relevance_score * 100, 100)}%`,
                                    backgroundColor: msg.metadata.relevance_score >= config.retrieval_threshold ? 'var(--color-indigo)' : 'var(--color-rose)'
                                  }} 
                                />
                              </div>
                            </div>
                          </div>

                          {/* Grounded RAG file citation */}
                          {msg.metadata.source_document && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <span style={{ fontWeight: '600' }}>Grounded Source: </span>
                              <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{msg.metadata.source_document}</code>
                            </div>
                          )}

                          {/* Escalation details */}
                          {msg.metadata.escalated && (
                            <div className="escalation-alert" style={{ marginTop: '0.5rem', padding: '0.6rem' }}>
                              <ShieldAlert size={16} className="escalation-alert-icon" style={{ marginTop: '0' }} />
                              <div className="escalation-alert-content">
                                <h4 style={{ fontSize: '0.75rem', marginBottom: '0.1rem' }}>Escalated to Human Agent</h4>
                                <p style={{ fontSize: '0.7rem' }}>{msg.metadata.escalation_reason}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="message-row bot">
                <span className="message-sender">
                  <Bot size={12} />
                  Triage AI is classifying & searching...
                </span>
                <div className="message-bubble" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="dot-bounce"></span>
                  <span className="dot-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="dot-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <form 
              className="chat-form" 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <input 
                type="text" 
                className="chat-input"
                placeholder="Ask support a question (e.g. refund status, API limits)..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={!backendOnline || isLoading}
              />
              <button 
                type="submit" 
                className="btn-send"
                disabled={!backendOnline || isLoading || !inputValue.trim()}
              >
                Send <Send size={16} />
              </button>
            </form>
          </div>
        </section>

        {/* Right Column: Control Dashboard (Tabs) */}
        <section className="control-panel">
          <nav className="tabs-navigation">
            <button 
              className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <Settings size={18} />
              Settings
            </button>
            <button 
              className={`tab-btn ${activeTab === "escalations" ? "active" : ""}`}
              onClick={() => setActiveTab("escalations")}
            >
              <div>
                <AlertTriangle size={18} style={{ display: 'inline-block' }} />
                {escalations.filter(t => t.status === "Pending").length > 0 && (
                  <span className="tab-badge">{escalations.filter(t => t.status === "Pending").length}</span>
                )}
              </div>
              Escalations
            </button>
            <button 
              className={`tab-btn ${activeTab === "kb" ? "active" : ""}`}
              onClick={() => setActiveTab("kb")}
            >
              <BookOpen size={18} />
              Knowledge Base
            </button>
          </nav>

          <div className="tab-content">
            
            {/* Settings Content */}
            {activeTab === "settings" && (
              <form onSubmit={handleSaveSettings} className="settings-list">
                <div>
                  <h3 className="settings-section-title">Escalation Thresholds</h3>
                  <div className="settings-group">
                    <label className="settings-label">
                      <span>Classification Threshold</span>
                      <span className="value">{config.classification_threshold.toFixed(2)}</span>
                    </label>
                    <div className="slider-container">
                      <input 
                        type="range" 
                        min="0.30" 
                        max="0.95" 
                        step="0.05"
                        value={config.classification_threshold} 
                        onChange={(e) => setConfig({ ...config, classification_threshold: parseFloat(e.target.value) })}
                        className="settings-slider"
                      />
                    </div>
                    <p className="settings-help">If the AI is less confident than this value when identifying Billing, Technical Support, or Account Access, it will immediately escalate to a human.</p>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div className="settings-group">
                    <label className="settings-label">
                      <span>RAG Retrieval Threshold</span>
                      <span className="value">{config.retrieval_threshold.toFixed(2)}</span>
                    </label>
                    <div className="slider-container">
                      <input 
                        type="range" 
                        min="0.05" 
                        max="0.60" 
                        step="0.05"
                        value={config.retrieval_threshold} 
                        onChange={(e) => setConfig({ ...config, retrieval_threshold: parseFloat(e.target.value) })}
                        className="settings-slider"
                      />
                    </div>
                    <p className="settings-help">Determines how closely a question must match your knowledge base documents. Low relevance match triggers escalation with details.</p>
                  </div>
                </div>

                <div>
                  <h3 className="settings-section-title">Generative AI Engine</h3>
                  <div className="settings-group">
                    <label className="settings-label">LLM Provider</label>
                    <div className="provider-selector">
                      <button 
                        type="button"
                        className={`provider-btn ${config.llm_provider === "local" ? "active" : ""}`}
                        onClick={() => setConfig({ ...config, llm_provider: "local" })}
                      >
                        Local Extractive
                      </button>
                      <button 
                        type="button"
                        className={`provider-btn ${config.llm_provider === "gemini" ? "active" : ""}`}
                        onClick={() => setConfig({ ...config, llm_provider: "gemini" })}
                      >
                        Gemini API
                      </button>
                      <button 
                        type="button"
                        className={`provider-btn ${config.llm_provider === "openai" ? "active" : ""}`}
                        onClick={() => setConfig({ ...config, llm_provider: "openai" })}
                      >
                        OpenAI API
                      </button>
                    </div>
                  </div>

                  {config.llm_provider === "gemini" && (
                    <div className="settings-group animate-fade-in" style={{ marginTop: '0.75rem' }}>
                      <label className="settings-label">Gemini API Key</label>
                      <input 
                        type="password" 
                        placeholder={config.gemini_api_key && config.gemini_api_key.startsWith("••••") ? config.gemini_api_key : "Enter GEMINI_API_KEY"}
                        onChange={(e) => setConfig({ ...config, gemini_api_key: e.target.value })}
                        className="api-key-input"
                      />
                    </div>
                  )}

                  {config.llm_provider === "openai" && (
                    <div className="settings-group animate-fade-in" style={{ marginTop: '0.75rem' }}>
                      <label className="settings-label">OpenAI API Key</label>
                      <input 
                        type="password" 
                        placeholder={config.openai_api_key && config.openai_api_key.startsWith("••••") ? config.openai_api_key : "Enter OPENAI_API_KEY"}
                        onChange={(e) => setConfig({ ...config, openai_api_key: e.target.value })}
                        className="api-key-input"
                      />
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn-save-settings" 
                  disabled={isSavingSettings || !backendOnline}
                >
                  {isSavingSettings ? "Saving Settings..." : "Save Configuration"}
                </button>
              </form>
            )}

            {/* Escalation Queue Content */}
            {activeTab === "escalations" && (
              <div className="escalation-list">
                <h3 className="settings-section-title">Triage Escalation Tickets</h3>
                
                {escalations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                    <CheckCircle size={32} style={{ color: 'var(--color-emerald)', marginBottom: '0.5rem' }} />
                    <p>No active escalation tickets</p>
                    <p style={{ fontSize: '0.75rem' }}>Tickets will appear here if customer messages fail triage thresholds.</p>
                  </div>
                ) : (
                  escalations.map(ticket => (
                    <div key={ticket.id} className={`ticket-card ${ticket.status.toLowerCase()}`}>
                      <div className="ticket-header">
                        <span className="ticket-id">Ticket #{ticket.id}</span>
                        <span className={`ticket-status-badge ${ticket.status.toLowerCase()}`}>{ticket.status}</span>
                      </div>
                      
                      <div className="ticket-body">
                        "{ticket.message}"
                      </div>
                      
                      <div className="ticket-reason">
                        <strong>Reason: </strong>{ticket.escalation_reason}
                      </div>

                      <div className="ticket-metrics">
                        <span>Cat: <strong>{ticket.predicted_category}</strong> ({(ticket.classification_confidence * 100).toFixed(0)}%)</span>
                        <span>KB Match: <strong>{(ticket.relevance_score * 100).toFixed(0)}%</strong></span>
                      </div>
                      
                      <div className="ticket-footer">
                        <span className="ticket-time">
                          {new Date(ticket.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                        </span>
                        {ticket.status === "Pending" && (
                          <button 
                            className="btn-resolve"
                            onClick={() => handleResolveTicket(ticket.id)}
                          >
                            Mark Handled
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Knowledge Base Content */}
            {activeTab === "kb" && (
              <div className="kb-list">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 className="settings-section-title" style={{ margin: '0', border: 'none', padding: '0' }}>Active Knowledge Base Documents</h3>
                  <button 
                    className="btn-add-file"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    onClick={() => setEditorModal({ open: true, name: "", content: "" })}
                    disabled={!backendOnline}
                  >
                    <Upload size={12} /> Add Document
                  </button>
                </div>
                
                {kbFiles.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No knowledge base files found. Add documents to begin.</p>
                ) : (
                  kbFiles.map((file, idx) => (
                    <div 
                      key={idx} 
                      className="kb-file-row"
                      onClick={() => setEditorModal({ open: true, name: file.name, content: file.content })}
                    >
                      <div className="kb-file-info">
                        <FileText size={18} className="kb-file-icon" />
                        <div>
                          <div className="kb-file-name">{file.name}</div>
                          <div className="kb-file-size">{(file.length / 1024).toFixed(1)} KB • {file.content.split('\n\n').length} paragraphs</div>
                        </div>
                      </div>
                      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ))
                )}
              </div>
            )}
            
          </div>
        </section>
      </div>

      {/* Editor Modal for Knowledge Base Files */}
      {editorModal.open && (
        <div className="kb-editor-overlay">
          <form className="kb-editor-modal" onSubmit={handleSaveKbFile}>
            <div className="modal-header">
              <h3>{editorModal.name ? `View/Edit: ${editorModal.name}` : "Create Knowledge Base Document"}</h3>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setEditorModal({ open: false, name: "", content: "" })}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="input-field">
                <label>File Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. pricing_details.txt"
                  value={editorModal.name}
                  onChange={(e) => setEditorModal({ ...editorModal, name: e.target.value })}
                  disabled={editorModal.name !== "" && kbFiles.some(f => f.name === editorModal.name)} // Disable name edit for existing files
                  required
                />
              </div>
              
              <div className="input-field">
                <label>Content (Plain text or Markdown paragraphs)</label>
                <textarea 
                  placeholder="Write clear, descriptive articles or policies. Use double lines to separate paragraphs so the RAG engine can chunk them properly."
                  value={editorModal.content}
                  onChange={(e) => setEditorModal({ ...editorModal, content: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setEditorModal({ open: false, name: "", content: "" })}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={isSavingKb}
              >
                {isSavingKb ? "Saving Document..." : "Save & Re-Index"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast Alert */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          <Info size={16} className="toast-icon" />
          <span className="toast-text">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
