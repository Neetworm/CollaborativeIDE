import { useState, useEffect, useRef } from "react";

// Simple markdown renderer for code blocks
function renderMessage(text) {
  if (!text) return null;

  const parts = [];
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex} style={{ whiteSpace: "pre-wrap" }}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    // Code block
    parts.push(
      <pre
        key={match.index}
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "6px",
          padding: "10px",
          overflowX: "auto",
          fontSize: "12px",
          margin: "8px 0",
          color: "#22c55e",
        }}
      >
        {match[1] && (
          <div style={{ color: "#64748b", fontSize: "10px", marginBottom: "4px" }}>
            {match[1]}
          </div>
        )}
        <code>{match[2].trim()}</code>
      </pre>
    );

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={lastIndex} style={{ whiteSpace: "pre-wrap" }}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function AiAssistant({ getCodeContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionLoading, setSessionLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) fetchSessions();
  }, [isOpen]);

  const fetchSessions = async () => {
    try {
      setSessionLoading(true);
      const res = await fetch(`${API_URL}/api/ai/sessions`, { headers });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Fetch sessions error:", err);
    } finally {
      setSessionLoading(false);
    }
  };

  const loadSession = async (id) => {
    try {
      setError("");
      const res = await fetch(`${API_URL}/api/ai/sessions/${id}`, { headers });
      if (!res.ok) throw new Error("Session not found");
      const data = await res.json();
      setActiveSession(id);
      setMessages(data.session.messages || []);
    } catch (err) {
      setError("Failed to load session.");
    }
  };

  const createNewSession = () => {
    if (sessions.length >= 5) {
      setError("Maximum 5 sessions reached. Delete one first.");
      return;
    }
    setActiveSession(null);
    setMessages([]);
    setError("");
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat session?")) return;
    try {
      await fetch(`${API_URL}/api/ai/sessions/${id}`, {
        method: "DELETE",
        headers,
      });
      if (activeSession === id) {
        setActiveSession(null);
        setMessages([]);
      }
      fetchSessions();
    } catch (err) {
      setError("Failed to delete session.");
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setError("");

    // Optimistically add user message
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const codeContext = getCodeContext ? getCodeContext() : "";

      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: userText,
          codeContext,
          sessionId: activeSession,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);

      if (!activeSession) {
        setActiveSession(data.sessionId);
        fetchSessions();
      }

    } catch (err) {
      setError(err.message);
      // Remove the optimistic user message on failure
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.floatingBtn}
        title="AI Coding Assistant"
      >
        {isOpen ? "✖" : "🤖"}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={styles.window}>
          {/* Header */}
          <div style={styles.header}>
            <div>
              <span style={{ fontWeight: "bold", fontSize: "14px" }}>🤖 Code Assistant</span>
              <span style={{ fontSize: "10px", color: "#94a3b8", marginLeft: "8px" }}>
                Gemini AI
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "16px" }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", height: "calc(100% - 44px)" }}>
            {/* Sidebar */}
            <div style={styles.sidebar}>
              <button
                onClick={createNewSession}
                style={styles.newBtn}
                disabled={sessions.length >= 5}
              >
                + New Chat
              </button>

              <div style={{ overflowY: "auto", flex: 1, marginTop: "8px" }}>
                {sessionLoading ? (
                  <div style={{ color: "#64748b", fontSize: "11px", textAlign: "center", padding: "10px" }}>
                    Loading...
                  </div>
                ) : sessions.length === 0 ? (
                  <div style={{ color: "#64748b", fontSize: "10px", textAlign: "center", padding: "10px" }}>
                    No chats yet
                  </div>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s._id}
                      onClick={() => loadSession(s._id)}
                      style={{
                        ...styles.sessionItem,
                        background: activeSession === s._id ? "#334155" : "transparent",
                        borderLeft: activeSession === s._id ? "2px solid #6366f1" : "2px solid transparent",
                      }}
                    >
                      <span style={{
                        flex: 1,
                        fontSize: "11px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {s.title}
                      </span>
                      <button
                        onClick={(e) => deleteSession(s._id, e)}
                        style={styles.delBtn}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div style={{ fontSize: "10px", color: "#475569", textAlign: "center", padding: "6px 0" }}>
                {sessions.length}/5 chats
              </div>
            </div>

            {/* Chat Area */}
            <div style={styles.chatArea}>
              {/* Messages */}
              <div style={styles.messagesBox}>
                {messages.length === 0 && !error && !loading && (
                  <div style={styles.emptyState}>
                    <div style={{ fontSize: "32px", marginBottom: "10px" }}>🤖</div>
                    <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
                      Hi! I'm your coding assistant.
                    </div>
                    <div style={{ color: "#475569", fontSize: "12px" }}>
                      I can see your current code. Ask me to:
                    </div>
                    <ul style={{ color: "#475569", fontSize: "12px", textAlign: "left", marginTop: "8px" }}>
                      <li>Explain the code</li>
                      <li>Find and fix bugs</li>
                      <li>Suggest improvements</li>
                      <li>Write new functions</li>
                    </ul>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.message,
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      background: m.role === "user" ? "#3b82f6" : "#1e293b",
                      color: "white",
                      maxWidth: m.role === "user" ? "85%" : "95%",
                    }}
                  >
                    {m.role === "model" ? (
                      <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                        {renderMessage(m.text)}
                      </div>
                    ) : (
                      <span style={{ fontSize: "13px" }}>{m.text}</span>
                    )}
                  </div>
                ))}

                {loading && (
                  <div style={{ ...styles.message, alignSelf: "flex-start", background: "#1e293b" }}>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <span style={{ animation: "pulse 1s infinite", color: "#6366f1" }}>●</span>
                      <span style={{ animation: "pulse 1s infinite 0.2s", color: "#6366f1" }}>●</span>
                      <span style={{ animation: "pulse 1s infinite 0.4s", color: "#6366f1" }}>●</span>
                      <span style={{ color: "#94a3b8", fontSize: "12px", marginLeft: "6px" }}>
                        Thinking...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Error */}
              {error && (
                <div style={styles.errorBox}>
                  ⚠️ {error}
                  <button
                    onClick={() => setError("")}
                    style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", marginLeft: "8px" }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Input */}
              <form onSubmit={sendMessage} style={styles.inputArea}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your code... (Enter to send, Shift+Enter for newline)"
                  style={styles.input}
                  disabled={loading}
                  rows={2}
                />
                <button
                  type="submit"
                  style={{
                    ...styles.sendBtn,
                    opacity: loading || !input.trim() ? 0.5 : 1,
                    cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  }}
                  disabled={loading || !input.trim()}
                >
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
  floatingBtn: {
    position: "fixed", bottom: "20px", right: "20px",
    width: "52px", height: "52px", borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white", border: "none", fontSize: "22px",
    cursor: "pointer", boxShadow: "0 4px 15px rgba(99,102,241,0.4)",
    zIndex: 1000, transition: "transform 0.2s",
  },
  window: {
    position: "fixed", bottom: "82px", right: "20px",
    width: "520px", height: "560px",
    background: "#0f172a", borderRadius: "14px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    display: "flex", flexDirection: "column",
    zIndex: 999, overflow: "hidden",
    border: "1px solid #1e293b",
  },
  header: {
    padding: "12px 15px", background: "#1e293b",
    borderBottom: "1px solid #334155", color: "white",
    display: "flex", justifyContent: "space-between",
    alignItems: "center", flexShrink: 0,
  },
  sidebar: {
    width: "150px", background: "#0a0f1e",
    borderRight: "1px solid #1e293b",
    padding: "10px 8px", display: "flex",
    flexDirection: "column", flexShrink: 0,
  },
  newBtn: {
    background: "#6366f1", color: "white",
    border: "none", padding: "7px 6px",
    borderRadius: "6px", cursor: "pointer",
    fontSize: "12px", fontWeight: "bold",
    width: "100%",
  },
  sessionItem: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", padding: "6px 5px",
    borderRadius: "4px", cursor: "pointer",
    color: "white", marginBottom: "3px",
    transition: "background 0.15s",
  },
  delBtn: {
    background: "transparent", border: "none",
    color: "#ef4444", cursor: "pointer",
    padding: "2px", fontSize: "12px", flexShrink: 0,
  },
  chatArea: {
    flex: 1, display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  messagesBox: {
    flex: 1, overflowY: "auto", padding: "14px",
    display: "flex", flexDirection: "column", gap: "10px",
  },
  message: {
    padding: "10px 13px", borderRadius: "10px",
    fontSize: "13px", lineHeight: "1.5",
    wordBreak: "break-word",
  },
  emptyState: {
    textAlign: "center", padding: "20px",
    color: "#94a3b8", fontSize: "13px",
    margin: "auto",
  },
  errorBox: {
    background: "#450a0a", color: "#fca5a5",
    fontSize: "12px", padding: "8px 12px",
    display: "flex", alignItems: "center",
    justifyContent: "space-between", flexShrink: 0,
  },
  inputArea: {
    display: "flex", padding: "10px",
    background: "#1e293b",
    borderTop: "1px solid #334155",
    gap: "8px", alignItems: "flex-end",
    flexShrink: 0,
  },
  input: {
    flex: 1, background: "#0f172a",
    border: "1px solid #334155", color: "white",
    padding: "8px 10px", borderRadius: "8px",
    outline: "none", fontSize: "13px",
    resize: "none", fontFamily: "inherit",
    lineHeight: "1.4",
  },
  sendBtn: {
    background: "#6366f1", color: "white",
    border: "none", padding: "8px 14px",
    borderRadius: "8px", cursor: "pointer",
    fontSize: "16px", flexShrink: 0,
    alignSelf: "flex-end",
  },
};

export default AiAssistant;