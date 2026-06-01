import { API_URL } from "../config.js";
// import AiAssistant from "../components/AiAssistant";
import CloudStorage from "../components/CloudStorage";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import Navbar from "../components/Navbar";
import Console from "../components/Console";
import FileTree from "../components/FileTree";

const langMap = { JavaScript:"javascript", Python:"python", "C++":"cpp", Java:"java" };

function Room() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId, language } = location.state || {};
  const editorLang = langMap[language] || "javascript";
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // Refs
  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const pendingCode = useRef(null);
  const cursorDecorations = useRef({});
  const lastCursorEmit = useRef(0);

  // ★ Refs that keep latest values for callbacks (fixes stale closure)
  const followMeRef = useRef({ active: false, leaderId: null, leaderName: null });
  const mySocketIdRef = useRef(null);
  const isFollowerScrollLock = useRef(false);

  // State
  const [mySocketId, setMySocketId] = useState(null);
  const [joinStatus, setJoinStatus] = useState("connecting");
  const [joinMessage, setJoinMessage] = useState("Connecting...");
  const [activeUsers, setActiveUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [fileTree, setFileTree] = useState({ files: [], activeFileId: null });
  const [followMe, setFollowMe] = useState({ active: false, leaderId: null, leaderName: null });
  const [analytics, setAnalytics] = useState({});
  const [roomSettings, setRoomSettings] = useState({ creator: "", isPublic: true });
  const [pendingRequests, setPendingRequests] = useState([]);

  const isLeader = currentUser.username === roomSettings.creator;

  // ★ Keep refs in sync with state
  useEffect(() => {
    followMeRef.current = followMe;
  }, [followMe]);

  useEffect(() => {
    mySocketIdRef.current = mySocketId;
  }, [mySocketId]);

  // ============ SOCKET SETUP ============
  useEffect(() => {
    if (!location.state || !token) {
      navigate(token ? "/" : "/auth");
      return;
    }

    const socket = io(API_URL, {
      autoConnect: false,
      auth: { token },
    });
    socketRef.current = socket;

    // --- Connection ---
    socket.on("connect", () => {
      console.log("Connected as:", currentUser.username, "Socket:", socket.id);
      setMySocketId(socket.id);
      mySocketIdRef.current = socket.id;
      socket.emit("join-room", { roomId, language });
    });

    socket.on("connect_error", (err) => {
      if (err.message === "AUTH_REQUIRED" || err.message === "INVALID_TOKEN") {
        localStorage.clear();
        navigate("/auth");
      }
    });

    // --- Join status ---
    socket.on("join-status", ({ status, message }) => {
      setJoinStatus(status);
      setJoinMessage(message || "");
    });

    // --- Room settings ---
    socket.on("room-settings-update", (settings) => setRoomSettings(settings));

    // --- Pending requests ---
    socket.on("pending-requests-update", (requests) => setPendingRequests(requests));

    // --- Code sync ---
    socket.on("code-update", (newCode) => {
      if (editorRef.current) {
        const editor = editorRef.current;
        if (editor.getValue() === newCode) return;
        isRemoteUpdate.current = true;
        const pos = editor.getPosition();
        const scroll = editor.getScrollTop();
        editor.executeEdits("remote", [{
          range: editor.getModel().getFullModelRange(),
          text: newCode,
          forceMoveMarkers: true,
        }]);
        try {
          if (pos) {
            const m = editor.getModel();
            const l = Math.min(pos.lineNumber, m.getLineCount());
            const c = Math.min(pos.column, m.getLineMaxColumn(l));
            editor.setPosition({ lineNumber: l, column: c });
          }
          editor.setScrollTop(scroll);
        } catch (e) {}
        isRemoteUpdate.current = false;
      } else {
        pendingCode.current = newCode;
      }
    });

    // --- Users ---
    socket.on("room-users-update", (users) => setActiveUsers(users));

    // --- Chat ---
    socket.on("receive-chat", (msg) => setChatMessages((prev) => [...prev, msg]));

    // --- File tree ---
    socket.on("file-tree-sync", (tree) => setFileTree(tree));

    // --- Cursors ---
    socket.on("cursor-update", ({ socketId, username: u, color, position, selection }) => {
      if (!editorRef.current || !monacoRef.current) return;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      ensureCursorCSS(socketId, color, u);
      if (!cursorDecorations.current[socketId]) {
        cursorDecorations.current[socketId] = editor.createDecorationsCollection();
      }
      const decs = [];
      const clean = socketId.replace(/[^a-zA-Z0-9]/g, "");
      if (position) {
        const maxL = editor.getModel().getLineCount();
        const l = Math.min(position.lineNumber, maxL);
        const maxC = editor.getModel().getLineMaxColumn(l);
        const c = Math.min(position.column, maxC);
        decs.push({
          range: new monaco.Range(l, c, l, c),
          options: {
            className: `cur-${clean}`,
            afterContentClassName: `cur-label-${clean}`,
            hoverMessage: { value: `**${u}**` },
            stickiness: 1,
          },
        });
      }
      if (selection && (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn)) {
        decs.push({
          range: new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn),
          options: { className: `sel-${clean}`, stickiness: 1 },
        });
      }
      cursorDecorations.current[socketId].set(decs);
    });

    socket.on("all-cursors", (cursors) => {
      Object.entries(cursors).forEach(([sid, data]) => {
        socket.listeners("cursor-update")[0]?.({ socketId: sid, ...data });
      });
    });

    socket.on("cursor-remove", ({ socketId }) => {
      cursorDecorations.current[socketId]?.set([]);
      delete cursorDecorations.current[socketId];
      removeCursorCSS(socketId);
    });

    // --- Follow me ---
    socket.on("follow-me-state", (state) => {
      setFollowMe(state);
      followMeRef.current = state;
    });

    // ★ Leader scroll — followers receive this
    socket.on("leader-scroll", ({ scrollTop, scrollLeft }) => {
      const fm = followMeRef.current;
      const myId = mySocketIdRef.current;
      // Only apply if follow-me is active AND I am NOT the leader
      if (fm.active && fm.leaderId !== myId && editorRef.current) {
        isFollowerScrollLock.current = true;
        editorRef.current.setScrollPosition({ scrollTop, scrollLeft });
        // Unlock after a short delay to prevent echo
        setTimeout(() => {
          isFollowerScrollLock.current = false;
        }, 100);
      }
    });

    // ★ Leader cursor position — followers jump to leader's cursor
    socket.on("leader-cursor", ({ lineNumber, column }) => {
      const fm = followMeRef.current;
      const myId = mySocketIdRef.current;
      if (fm.active && fm.leaderId !== myId && editorRef.current) {
        editorRef.current.revealLineInCenter(lineNumber);
      }
    });

    // ★ Leader file switch — followers switch file too
    socket.on("leader-file-switch", ({ fileId }) => {
      const fm = followMeRef.current;
      const myId = mySocketIdRef.current;
      if (fm.active && fm.leaderId !== myId) {
        // The file-tree-sync + code-update already handles this
        // This is just for visual indication
        console.log("Leader switched to file:", fileId);
      }
    });

    // --- Terminal ---
    socket.on("terminal-output", ({ type, data }) => {
      setLogs((prev) => [...prev, { type, data }]);
      if (type === "exit") setIsRunning(false);
    });

    // --- Analytics ---
    socket.on("analytics-update", (data) => setAnalytics(data));
    socket.on("analytics-milestone", (m) => {
      setChatMessages((prev) => [...prev, { sender: "eWatcher", text: m.message, isSystem: true }]);
    });

    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      document.querySelectorAll("[data-cursor-style]").forEach((el) => el.remove());
    };
  }, [roomId, navigate, location.state, token, language]);

  // ============ EDITOR HANDLERS ============
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (pendingCode.current !== null) {
      editor.getModel().setValue(pendingCode.current);
      pendingCode.current = null;
    }

    // Cursor tracking
    editor.onDidChangeCursorPosition(() => {
      const now = Date.now();
      if (now - lastCursorEmit.current < 50) return;
      lastCursorEmit.current = now;

      const position = editor.getPosition();
      const selection = editor.getSelection();

      socketRef.current?.emit("cursor-update", { roomId, position, selection });

      // ★ If I'm the leader, broadcast my cursor position
      const fm = followMeRef.current;
      const myId = mySocketIdRef.current;
      if (fm.active && fm.leaderId === myId) {
        socketRef.current?.emit("leader-cursor", {
          roomId,
          lineNumber: position.lineNumber,
          column: position.column,
        });
      }
    });

    editor.onDidChangeCursorSelection(() => {
      socketRef.current?.emit("cursor-update", {
        roomId,
        position: editor.getPosition(),
        selection: editor.getSelection(),
      });
    });

    // ★ Scroll tracking — uses REFS not state (fixes stale closure)
    editor.onDidScrollChange((e) => {
      // Don't broadcast if this scroll was caused by following the leader
      if (isFollowerScrollLock.current) return;

      const fm = followMeRef.current;
      const myId = mySocketIdRef.current;

      if (fm.active && fm.leaderId === myId) {
        socketRef.current?.emit("leader-scroll", {
          roomId,
          scrollTop: e.scrollTop,
          scrollLeft: e.scrollLeft,
        });
      }
    });
  };

  const handleEditorChange = (value) => {
    if (isRemoteUpdate.current) return;
    socketRef.current?.emit("code-change", { roomId, code: value });
  };

  // ============ ACTIONS ============
  const handleRunCode = () => {
    if (!editorRef.current) return;
    setLogs([]);
    setIsRunning(true);
    socketRef.current?.emit("run-code", {
      roomId,
      code: editorRef.current.getValue(),
      language: editorLang,
    });
  };

  const handleStopCode = () => {
    socketRef.current?.emit("stop-code");
    setIsRunning(false);
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      socketRef.current?.emit("send-chat", { roomId, sender: currentUser.username, text: chatInput });
      setChatInput("");
    }
  };

  const handleFileSelect = (fileId) => {
    socketRef.current?.emit("file-select", { roomId, fileId });

    // ★ If I'm the leader, broadcast file switch
    const fm = followMeRef.current;
    const myId = mySocketIdRef.current;
    if (fm.active && fm.leaderId === myId) {
      socketRef.current?.emit("leader-file-switch", { roomId, fileId });
    }
  };

  const handleApprove = (username) => {
    socketRef.current?.emit("join-request-respond", { roomId, requesterUsername: username, approved: true });
  };

  const handleDeny = (username) => {
    socketRef.current?.emit("join-request-respond", { roomId, requesterUsername: username, approved: false });
  };

  const toggleAccess = () => {
    socketRef.current?.emit("toggle-room-access", { roomId });
  };

  const toggleFollowMe = () => {
    socketRef.current?.emit("follow-me-toggle", { roomId });
  };

  // ===== WAITING / DENIED / CONNECTING SCREENS =====
  if (joinStatus === "pending") {
    return (
      <div style={{ height: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "white", fontFamily: "Arial" }}>
        <div style={{ background: "#1e293b", padding: "40px", borderRadius: "16px", textAlign: "center", maxWidth: "400px" }}>
          <div style={{ fontSize: "48px", marginBottom: "15px" }}>⏳</div>
          <h2 style={{ color: "#facc15", margin: "0 0 10px" }}>Waiting for Approval</h2>
          <p style={{ color: "#94a3b8", margin: "0 0 20px" }}>{joinMessage}</p>
          <p style={{ color: "#64748b", fontSize: "13px" }}>The room leader will approve or deny your request.</p>
          <button onClick={() => navigate("/")} style={{ marginTop: "20px", padding: "10px 20px", background: "#334155", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (joinStatus === "denied") {
    return (
      <div style={{ height: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "white", fontFamily: "Arial" }}>
        <div style={{ background: "#1e293b", padding: "40px", borderRadius: "16px", textAlign: "center", maxWidth: "400px" }}>
          <div style={{ fontSize: "48px", marginBottom: "15px" }}>🚫</div>
          <h2 style={{ color: "#ef4444", margin: "0 0 10px" }}>Access Denied</h2>
          <p style={{ color: "#94a3b8", margin: "0 0 20px" }}>{joinMessage}</p>
          <button onClick={() => navigate("/")} style={{ padding: "10px 20px", background: "#38bdf8", color: "#0f172a", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (joinStatus === "connecting") {
    return (
      <div style={{ height: "100vh", background: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center", color: "#38bdf8", fontSize: "18px", fontFamily: "Arial" }}>
        Connecting to room...
      </div>
    );
  }

  // ===== MAIN ROOM =====
  const isFollowLeader = followMe.active && followMe.leaderId === mySocketId;
  const isFollower = followMe.active && followMe.leaderId !== mySocketId;

  return (
    <div style={st.container}>
      <Navbar user={currentUser} />
      <div style={st.main}>
        {/* SIDEBAR */}
        <div style={st.sidebar}>
          <h3 style={st.sideTitle}>Room: {roomId}</h3>
          <p style={st.roomText}><b>Lang:</b> <span style={{ color: "#22c55e" }}>{language}</span></p>
          <p style={st.roomText}>{roomSettings.isPublic ? "🔓 Public" : "🔒 Private"}</p>

          {/* Leader controls */}
          {isLeader && (
            <div style={{ marginTop: "8px", padding: "8px", background: "#334155", borderRadius: "6px" }}>
              <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#facc15", fontWeight: "bold" }}>👑 Leader Controls</p>
              <button onClick={toggleAccess} style={{ ...st.btn, background: roomSettings.isPublic ? "#ef4444" : "#22c55e", fontSize: "11px", padding: "6px" }}>
                {roomSettings.isPublic ? "🔒 Make Private" : "🔓 Make Public"}
              </button>
              {pendingRequests.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <p style={{ fontSize: "11px", color: "#facc15", margin: "0 0 4px" }}>Pending ({pendingRequests.length}):</p>
                  {pendingRequests.map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e293b", padding: "4px 6px", borderRadius: "4px", marginBottom: "3px" }}>
                      <span style={{ fontSize: "12px" }}>{r.username}</span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button onClick={() => handleApprove(r.username)} style={{ background: "#22c55e", border: "none", borderRadius: "3px", color: "white", padding: "2px 6px", cursor: "pointer", fontSize: "11px" }}>✓</button>
                        <button onClick={() => handleDeny(r.username)} style={{ background: "#ef4444", border: "none", borderRadius: "3px", color: "white", padding: "2px 6px", cursor: "pointer", fontSize: "11px" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users */}
          <p style={{ ...st.roomText, marginTop: "10px" }}><b>Online ({activeUsers.length})</b></p>
          <ul style={st.userList}>
            {activeUsers.map((u, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <span style={{ ...st.dot, backgroundColor: u.color }}></span>
                {u.username}
                {u.username === currentUser.username && " (You)"}
                {u.username === roomSettings.creator && <span style={{ fontSize: "14px" }} title="Room Leader"> 👑</span>}
              </li>
            ))}
          </ul>

          {/* Follow Me */}
          <button onClick={toggleFollowMe} style={{
            ...st.btn,
            background: followMe.active ? (isFollowLeader ? "#ef4444" : "#6366f1") : "#6366f1",
            marginTop: "5px"
          }}>
            {followMe.active
              ? (isFollowLeader
                ? "⏹ Stop Follow Me"
                : `👁 Following ${followMe.leaderName}`)
              : "📍 Start Follow Me"}
          </button>

          {/* Follow Me indicator */}
          {isFollower && (
            <div style={{ marginTop: "4px", padding: "6px", background: "#6366f133", borderRadius: "6px", fontSize: "11px", color: "#a5b4fc", textAlign: "center" }}>
              🔒 Scroll synced to {followMe.leaderName}'s view
            </div>
          )}

          {/* File Tree */}
          <div style={{ marginTop: "12px", borderTop: "1px solid #334155", paddingTop: "8px" }}>
            <FileTree
              fileTree={fileTree}
              onSelect={handleFileSelect}
              onCreate={(f) => socketRef.current?.emit("file-create", { roomId, file: f })}
              onRename={(fid, n) => socketRef.current?.emit("file-rename", { roomId, fileId: fid, newName: n })}
              onDelete={(fid) => socketRef.current?.emit("file-delete", { roomId, fileId: fid })}
              language={language}
            />
          </div>

          <CloudStorage
            roomId={roomId}
            isLeader={isLeader}
            onRestore={() => {}}
          />

          {/* Run/Stop */}
          {isRunning ? (
            <button onClick={handleStopCode} style={{ ...st.btn, background: "#ef4444", marginTop: "8px" }}>⏹ Stop</button>
          ) : (
            <button onClick={handleRunCode} style={{ ...st.btn, background: "#22c55e", marginTop: "8px" }}>▶ Run Code</button>
          )}
          <button onClick={() => setLogs([])} style={{ ...st.btn, background: "#facc15", color: "#0f172a", marginTop: "4px" }}>🧹 Clear</button>

          {/* Stats */}
          {analytics[currentUser.username] && (
            <div style={{ marginTop: "8px", borderTop: "1px solid #334155", paddingTop: "8px", fontSize: "11px", color: "#94a3b8" }}>
              <b style={{ color: "#38bdf8" }}>Your Stats</b>
              <div>Edits: {analytics[currentUser.username].totalEdits}</div>
              <div>✅{analytics[currentUser.username].successfulBuilds} ❌{analytics[currentUser.username].failedBuilds}</div>
            </div>
          )}

          {/* Chat */}
          <div style={st.chatSection}>
            <h4 style={st.chatTitle}>Live Chat</h4>
            <div style={st.chatBox}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: "3px", fontSize: "12px", color: msg.isSystem ? "#94a3b8" : "white", fontStyle: msg.isSystem ? "italic" : "normal", wordWrap: "break-word" }}>
                  {!msg.isSystem && <strong style={{ color: msg.sender === currentUser.username ? "#38bdf8" : "#22c55e" }}>{msg.sender}: </strong>}
                  {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={sendChat} style={{ display: "flex", gap: "4px" }}>
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Message..." style={st.chatInput} />
              <button type="submit" style={st.chatBtn}>Send</button>
            </form>
          </div>
        </div>

        {/* EDITOR + CONSOLE */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Editor
              height="100%"
              width="100%"
              language={editorLang}
              theme="vs-dark"
              onMount={handleEditorMount}
              onChange={handleEditorChange}
              options={{ fontSize: 15, minimap: { enabled: false } }}
            />
            {/* Follow Me overlay indicator */}
            {isFollower && (
              <div style={{
                position: "absolute", top: "8px", right: "8px",
                background: "#6366f1", color: "white", padding: "4px 12px",
                borderRadius: "12px", fontSize: "12px", fontWeight: "bold",
                zIndex: 10, opacity: 0.9,
              }}>
                👁 Following {followMe.leaderName}
              </div>
            )}
          </div>
          <div style={{ height: "200px" }}>
            <Console logs={logs} />
          </div>
        </div>
      </div>
      {/* {<AiAssistant getCodeContext={() => editorRef.current ? editorRef.current.getValue() : ""} /> } */}
    </div>
  );
}

// ============ CURSOR CSS ============
function ensureCursorCSS(socketId, color, username) {
  const c = socketId.replace(/[^a-zA-Z0-9]/g, "");
  if (document.getElementById(`cs-${c}`)) return;
  const style = document.createElement("style");
  style.id = `cs-${c}`;
  style.setAttribute("data-cursor-style", "true");
  style.textContent = `.cur-${c}{border-left:2px solid ${color}!important}.cur-label-${c}::after{content:"${username}";position:absolute;top:-18px;left:0;background:${color};color:white;font-size:10px;padding:1px 4px;border-radius:2px;pointer-events:none;white-space:nowrap;z-index:100}.sel-${c}{background-color:${color}33!important}`;
  document.head.appendChild(style);
}

function removeCursorCSS(socketId) {
  const c = socketId.replace(/[^a-zA-Z0-9]/g, "");
  document.getElementById(`cs-${c}`)?.remove();
}

// ============ STYLES ============
const st = {
  container: { height: "100vh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden" },
  main: { flex: 1, display: "flex", width: "100%", overflow: "hidden" },
  sidebar: { width: "280px", background: "#1e293b", color: "white", padding: "12px", fontFamily: "Arial", borderRight: "2px solid #0f172a", display: "flex", flexDirection: "column", overflowY: "auto" },
  sideTitle: { margin: "0 0 6px", fontSize: "15px", color: "#38bdf8" },
  roomText: { margin: "3px 0", fontSize: "12px", opacity: 0.9 },
  userList: { margin: "4px 0 8px", paddingLeft: "0", fontSize: "12px", listStyle: "none" },
  dot: { width: "8px", height: "8px", borderRadius: "50%", display: "inline-block" },
  btn: { width: "100%", padding: "7px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", color: "white" },
  chatSection: { marginTop: "auto", borderTop: "1px solid #334155", paddingTop: "8px", display: "flex", flexDirection: "column", minHeight: "140px" },
  chatTitle: { margin: "0 0 6px", fontSize: "13px", color: "#94a3b8" },
  chatBox: { flex: 1, background: "#0f172a", borderRadius: "6px", padding: "6px", overflowY: "auto", marginBottom: "6px", maxHeight: "130px" },
  chatInput: { flex: 1, padding: "5px", borderRadius: "4px", border: "none", outline: "none", background: "#334155", color: "white", fontSize: "11px" },
  chatBtn: { background: "#38bdf8", border: "none", borderRadius: "4px", padding: "0 8px", cursor: "pointer", fontWeight: "bold", color: "#0f172a", fontSize: "11px" },
};

export default Room;