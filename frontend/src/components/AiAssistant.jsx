import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";

function AiAssistant({ getCodeContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = { 
    "Content-Type": "application/json", 
    Authorization: `Bearer ${token}` 
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch sessions when opened
  useEffect(() => {
    if (isOpen) fetchSessions();
  }, [isOpen]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions`, { headers });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) { console.error(err); }
  };

  const loadSession = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/ai/sessions/${id}`, { headers });
      const data = await res.json();
      setActiveSession(id);
      setMessages(data.session.messages);
      setError("");
    } catch (err) { console.error(err); }
  };

  const createNewSession = () => {
    if (sessions.length >= 5) {
      setError("Maximum 5 sessions reached. Please delete one first.");
      return;
    }
    setActiveSession(null);
    setMessages([]);
    setError("");
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat?")) return;
    try {
      await fetch(`http://localhost:5000/api/ai/sessions/${id}`, { method: "DELETE", headers });
      if (activeSession === id) createNewSession();
      fetchSessions();
    } catch (err) { console.error(err); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    setError("");
    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: userText,
          codeContext: getCodeContext(), // Gets current code from editor
          sessionId: activeSession
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "model", text: data.reply }]);
      
      // If it was a new session, update our session list
      if (!activeSession) {
        setActiveSession(data.sessionId);
        fetchSessions();
      }
    } catch (err) {
      setError(err.message);
      // Remove the user message if it failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={styles.floatingBtn}
        title="AI Assistant"
      >
        {isOpen ? "✖" : "🤖"}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={styles.window}>
          <div style={styles.header}>
            <span style={{ fontWeight: "bold" }}>🤖 Code Assistant</span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Gemini AI</span>
          </div>

          <div style={{ display: "flex", height: "calc(100% - 40px)" }}>
            {/* Sidebar - Sessions */}
            <div style={styles.sidebar}>
              <button onClick={createNewSession} style={styles.newBtn}>+ New Chat</button>
              <div style={{ overflowY: "auto", flex: 1, marginTop: "10px" }}>
                {sessions.map(s => (
                  <div 
                    key={s._id} 
                    onClick={() => loadSession(s._id)}
                    style={{
                      ...styles.sessionItem,
                      background: activeSession === s._id ? "#334155" : "transparent"
                    }}
                  >
                    <span style={{ truncate: "true", flex: 1, fontSize: "11px" }}>{s.title}</span>
                    <button onClick={(e) => deleteSession(s._id, e)} style={styles.delBtn}>🗑</button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", textAlign: "center", marginTop: "5px" }}>
                {sessions.length}/5 Chats Used
              </div>
            </div>

            {/* Chat Area */}
            <div style={styles.chatArea}>
              <div style={styles.messagesBox}>
                {messages.length === 0 && !error && (
                  <div style={styles.emptyText}>
                    👋 Hi! I can see your code. Ask me to explain it, find bugs, or suggest improvements!
                  </div>
                )}
                
                {messages.map((m, i) => (
                  <div key={i} style={{
                    ...styles.message,
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    background: m.role === "user" ? "#38bdf8" : "#334155",
                    color: m.role === "user" ? "#0f172a" : "white"
                  }}>
                    {m.text}
                  </div>
                ))}
                
                {loading && <div style={{...styles.message, alignSelf: "flex-start", background: "#334155"}}>Thinking... ⏳</div>}
                <div ref={messagesEndRef} />
              </div>

              {error && <div style={styles.errorBox}>{error}</div>}

              <form onSubmit={sendMessage} style={styles.inputArea}>
                <input 
                  type="text" 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  placeholder="Ask about your code..." 
                  style={styles.input}
                  disabled={loading}
                />
                <button type="submit" style={styles.sendBtn} disabled={loading || !input.trim()}>
                  ➤
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  floatingBtn: { position: "fixed", bottom: "20px", right: "20px", width: "50px", height: "50px", borderRadius: "25px", background: "#6366f1", color: "white", border: "none", fontSize: "24px", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 1000 },
  window: { position: "fixed", bottom: "80px", right: "20px", width: "450px", height: "500px", background: "#1e293b", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", zIndex: 999, overflow: "hidden", border: "1px solid #334155" },
  header: { padding: "10px 15px", background: "#0f172a", borderBottom: "1px solid #334155", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" },
  sidebar: { width: "140px", background: "#0f172a", borderRight: "1px solid #334155", padding: "10px", display: "flex", flexDirection: "column" },
  newBtn: { background: "#22c55e", color: "white", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold", width: "100%" },
  sessionItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px", borderRadius: "4px", cursor: "pointer", color: "white", marginBottom: "4px" },
  delBtn: { background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px" },
  chatArea: { flex: 1, display: "flex", flexDirection: "column", background: "#0f172a" },
  messagesBox: { flex: 1, overflowY: "auto", padding: "15px", display: "flex", flexDirection: "column", gap: "10px" },
  message: { maxWidth: "85%", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", whiteSpace: "pre-wrap" },
  emptyText: { color: "#64748b", textAlign: "center", marginTop: "20px", fontSize: "13px", fontStyle: "italic" },
  errorBox: { background: "#7f1d1d", color: "#fca5a5", fontSize: "11px", padding: "6px", textAlign: "center" },
  inputArea: { display: "flex", padding: "10px", background: "#1e293b", borderTop: "1px solid #334155" },
  input: { flex: 1, background: "#0f172a", border: "1px solid #334155", color: "white", padding: "8px", borderRadius: "4px", outline: "none", fontSize: "13px" },
  sendBtn: { background: "#6366f1", color: "white", border: "none", padding: "0 15px", marginLeft: "8px", borderRadius: "4px", cursor: "pointer" }
};

export default AiAssistant;