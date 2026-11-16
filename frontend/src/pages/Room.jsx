import CloudStorage from "../components/CloudStorage";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Console from "../components/Console";
import FileTree from "../components/FileTree";
import { API_BASE_URL } from "../config";

const langMap = {
  JavaScript: "javascript",
  Python: "python",
  "C++": "cpp",
  Java: "java",
};

const IconButton = ({ onClick, icon, bgColor, color, label, danger }) => (
  <button
    onClick={onClick}
    style={{
      ...st.iconBtn,
      background: bgColor,
      color: color,
      ...(danger ? st.dangerBtnHover : st.btnHover),
    }}
    title={label}
  >
    {icon}
  </button>
);

function Room() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId, language } = location.state || {};
  const editorLang = langMap[language] || "javascript";
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const pendingCode = useRef(null);
  const cursorDecorations = useRef({});
  const lastCursorEmit = useRef(0);
  const followMeRef = useRef({
    active: false,
    leaderId: null,
    leaderName: null,
  });
  const mySocketIdRef = useRef(null);
  const isFollowerScrollLock = useRef(false);

  const [mySocketId, setMySocketId] = useState(null);
  const [joinStatus, setJoinStatus] = useState("connecting");
  const [joinMessage, setJoinMessage] = useState("Connecting...");
  const [activeUsers, setActiveUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [fileTree, setFileTree] = useState({ files: [], activeFileId: null });
  const [followMe, setFollowMe] = useState({
    active: false,
    leaderId: null,
    leaderName: null,
  });
  const [analytics, setAnalytics] = useState({});
  const [roomSettings, setRoomSettings] = useState({
    creator: "",
    isPublic: true,
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [stdin, setStdin] = useState("");
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 15,
    minimap: false,
    wordWrap: "off",
    formatOnPaste: true,
    formatOnType: true,
  });
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleGlobalSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = [];
    fileTree.files.forEach((file) => {
      if (
        file.content &&
        file.content.toLowerCase().includes(query.toLowerCase())
      ) {
        file.content.split("\n").forEach((line, index) => {
          if (line.toLowerCase().includes(query.toLowerCase()))
            results.push({
              fileId: file.id,
              fileName: file.name,
              lineNum: index + 1,
              text: line.trim(),
            });
        });
      }
    });
    setSearchResults(results);
  };

  const jumpToFile = (fileId) => {
    handleFileSelect(fileId);
    setShowSearchModal(false);
  };
  const isLeader = currentUser.username === roomSettings.creator;

  useEffect(() => {
    followMeRef.current = followMe;
  }, [followMe]);
  useEffect(() => {
    mySocketIdRef.current = mySocketId;
  }, [mySocketId]);

  useEffect(() => {
    if (!location.state || !token) {
      navigate(token ? "/" : "/auth");
      return;
    }
    const socket = io(API_BASE_URL, {
      autoConnect: false,
      auth: { token },
      transports: ["websocket", "polling"], 
      timeout: 60000, 
      reconnectionAttempts: 10, 
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setMySocketId(socket.id);
      mySocketIdRef.current = socket.id;
      socket.emit("join-room", { roomId, language });
    });

    socket.on("connect_error", (err) => {
      if (err.message === "AUTH_REQUIRED" || err.message === "INVALID_TOKEN") {
        localStorage.clear();
        navigate("/auth");
        return;
      }
      setJoinStatus("error");
      setJoinMessage("Unable to connect to the server.");
    });

    socket.on("join-status", ({ status, message }) => {
      setJoinStatus(status);
      setJoinMessage(message || "");
    });
    socket.on("room-settings-update", (settings) => setRoomSettings(settings));
    socket.on("pending-requests-update", (requests) =>
      setPendingRequests(requests),
    );

    socket.on("code-update", (newCode) => {
      if (editorRef.current) {
        const editor = editorRef.current;
        if (editor.getValue() === newCode) return;
        isRemoteUpdate.current = true;
        const pos = editor.getPosition();
        const scroll = editor.getScrollTop();
        editor.executeEdits("remote", [
          {
            range: editor.getModel().getFullModelRange(),
            text: newCode,
            forceMoveMarkers: true,
          },
        ]);
        try {
          if (pos) {
            const m = editor.getModel();
            const l = Math.min(pos.lineNumber, m.getLineCount());
            editor.setPosition({
              lineNumber: l,
              column: Math.min(pos.column, m.getLineMaxColumn(l)),
            });
          }
          editor.setScrollTop(scroll);
        } catch (e) {}
        isRemoteUpdate.current = false;
      } else pendingCode.current = newCode;
    });

    socket.on("room-users-update", (users) => setActiveUsers(users));
    socket.on("receive-chat", (msg) =>
      setChatMessages((prev) => [...prev, msg]),
    );
    socket.on("file-tree-sync", (tree) => {
      setFileTree(tree);
      if (tree.activeFileId && editorRef.current) {
        const activeFile = tree.files.find((f) => f.id === tree.activeFileId);
        if (activeFile) {
          isRemoteUpdate.current = true;
          editorRef.current.setValue(activeFile.content || "");
        }
      }
    });

    socketRef.current.on("snapshot-restored", ({ files }) => {
      setFileTree((prev) => {
        if (prev.activeFileId && editorRef.current) {
          const activeFile = files.find((f) => f.id === prev.activeFileId);
          if (activeFile) {
            isRemoteUpdate.current = true;
            editorRef.current.setValue(activeFile.content);
          }
        }
        return { ...prev, files };
      });
      toast.success("Project snapshot restored!");
    });

    socket.on(
      "cursor-update",
      ({ socketId, username: u, color, position, selection }) => {
        if (!editorRef.current || !monacoRef.current) return;
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        ensureCursorCSS(socketId, color, u);
        if (!cursorDecorations.current[socketId])
          cursorDecorations.current[socketId] =
            editor.createDecorationsCollection();
        const decs = [];
        const clean = socketId.replace(/[^a-zA-Z0-9]/g, "");
        if (position) {
          const l = Math.min(
            position.lineNumber,
            editor.getModel().getLineCount(),
          );
          const c = Math.min(
            position.column,
            editor.getModel().getLineMaxColumn(l),
          );
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
        if (
          selection &&
          (selection.startLineNumber !== selection.endLineNumber ||
            selection.startColumn !== selection.endColumn)
        ) {
          decs.push({
            range: new monaco.Range(
              selection.startLineNumber,
              selection.startColumn,
              selection.endLineNumber,
              selection.endColumn,
            ),
            options: { className: `sel-${clean}`, stickiness: 1 },
          });
        }
        cursorDecorations.current[socketId].set(decs);
      },
    );

    socket.on("all-cursors", (cursors) =>
      Object.entries(cursors).forEach(([sid, data]) =>
        socket.listeners("cursor-update")[0]?.({ socketId: sid, ...data }),
      ),
    );
    socket.on("cursor-remove", ({ socketId }) => {
      cursorDecorations.current[socketId]?.set([]);
      delete cursorDecorations.current[socketId];
      removeCursorCSS(socketId);
    });
    socket.on("follow-me-state", (state) => {
      setFollowMe(state);
      followMeRef.current = state;
    });
    socket.on("leader-scroll", ({ scrollTop, scrollLeft }) => {
      if (
        followMeRef.current.active &&
        followMeRef.current.leaderId !== mySocketIdRef.current &&
        editorRef.current
      ) {
        isFollowerScrollLock.current = true;
        editorRef.current.setScrollPosition({ scrollTop, scrollLeft });
        setTimeout(() => {
          isFollowerScrollLock.current = false;
        }, 100);
      }
    });
    socket.on("leader-cursor", ({ lineNumber }) => {
      if (
        followMeRef.current.active &&
        followMeRef.current.leaderId !== mySocketIdRef.current &&
        editorRef.current
      )
        editorRef.current.revealLineInCenter(lineNumber);
    });
    socket.on("terminal-output", ({ type, data }) => {
      setLogs((prev) => [...prev, { type, data }]);
      if (type === "exit") setIsRunning(false);
    });
    socket.on("analytics-update", (data) => setAnalytics(data));
    socket.on("analytics-milestone", (m) =>
      setChatMessages((prev) => [
        ...prev,
        { sender: "eWatcher", text: m.message, isSystem: true },
      ]),
    );

    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      document
        .querySelectorAll("[data-cursor-style]")
        .forEach((el) => el.remove());
    };
  }, [roomId, navigate, location.state, token, language]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    if (pendingCode.current !== null) {
      editor.getModel().setValue(pendingCode.current);
      pendingCode.current = null;
    }

    editor.onDidChangeCursorPosition(() => {
      const now = Date.now();
      if (now - lastCursorEmit.current < 50) return;
      lastCursorEmit.current = now;
      const position = editor.getPosition();
      socketRef.current?.emit("cursor-update", {
        roomId,
        position,
        selection: editor.getSelection(),
      });
      if (
        followMeRef.current.active &&
        followMeRef.current.leaderId === mySocketIdRef.current
      )
        socketRef.current?.emit("leader-cursor", {
          roomId,
          lineNumber: position.lineNumber,
          column: position.column,
        });
    });

    editor.onDidChangeCursorSelection(() =>
      socketRef.current?.emit("cursor-update", {
        roomId,
        position: editor.getPosition(),
        selection: editor.getSelection(),
      }),
    );
    editor.onDidScrollChange((e) => {
      if (isFollowerScrollLock.current) return;
      if (
        followMeRef.current.active &&
        followMeRef.current.leaderId === mySocketIdRef.current
      )
        socketRef.current?.emit("leader-scroll", {
          roomId,
          scrollTop: e.scrollTop,
          scrollLeft: e.scrollLeft,
        });
    });
  };

  const handleEditorChange = (value) => {
    if (!isRemoteUpdate.current)
      socketRef.current?.emit("code-change", { roomId, code: value });
  };
  const handleRunCode = () => {
    if (!editorRef.current) return;
    setLogs([]);
    setIsRunning(true);
    toast("Compiling & Running...", { icon: "⏳" });
    try {
      socketRef.current?.emit("run-code", {
        roomId,
        files: fileTree.files.map((file) => ({
          name: file.name,
          content:
            file.id === fileTree.activeFileId
              ? editorRef.current.getValue()
              : file.content,
        })),
        language: editorLang,
        stdin: stdin,
      });
    } catch (error) {
      setIsRunning(false);
      toast.error("Execution failed");
    }
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.formatDocument").run();
      toast.success("Code formatted", { duration: 1500 });
    }
  };
  const handleStopCode = () => {
    socketRef.current?.emit("stop-code");
    setIsRunning(false);
    toast.error("Execution stopped");
  };
  const sendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      socketRef.current?.emit("send-chat", { roomId, text: chatInput });
      setChatInput("");
    }
  };
  const handleFileSelect = (fileId) => {
    socketRef.current?.emit("file-select", { roomId, fileId });
    if (
      followMeRef.current.active &&
      followMeRef.current.leaderId === mySocketIdRef.current
    )
      socketRef.current?.emit("leader-file-switch", { roomId, fileId });
  };

  const handleApprove = (username) =>
    socketRef.current?.emit("join-request-respond", {
      roomId,
      requesterUsername: username,
      approved: true,
    });
  const handleDeny = (username) =>
    socketRef.current?.emit("join-request-respond", {
      roomId,
      requesterUsername: username,
      approved: false,
    });
  const toggleAccess = () =>
    socketRef.current?.emit("toggle-room-access", { roomId });
  const toggleFollowMe = () =>
    socketRef.current?.emit("follow-me-toggle", { roomId });

  if (["pending", "denied", "error", "not-found"].includes(joinStatus)) {
    return (
      <div style={st.centeredScreen}>
        <div style={st.glassCard}>
          <div style={{ fontSize: "48px", marginBottom: "15px" }}>
            {joinStatus === "pending"
              ? "⏳"
              : joinStatus === "denied"
                ? "🚫"
                : "⚠️"}
          </div>
          <h2
            style={{
              color: joinStatus === "pending" ? "#facc15" : "#ef4444",
              margin: "0 0 10px",
            }}
          >
            {joinStatus === "pending"
              ? "Waiting for Approval"
              : joinStatus === "denied"
                ? "Access Denied"
                : "Connection Error"}
          </h2>
          <p style={{ color: "#94a3b8", margin: "0 0 20px" }}>{joinMessage}</p>
          <button onClick={() => navigate("/dashboard")} style={st.primaryBtn}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (joinStatus === "connecting")
    return (
      <div style={st.centeredScreen}>
        <div
          style={{
            animation: "pulse 2s infinite",
            color: "#38bdf8",
            fontSize: "20px",
          }}
        >
          Connecting to workspace...
        </div>
      </div>
    );

  const isFollowLeader = followMe.active && followMe.leaderId === mySocketId;
  const isFollower = followMe.active && followMe.leaderId !== mySocketId;

  return (
    <div style={st.container}>
      <style>{`
        @keyframes slideInLeft { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeUpIn { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulseLive { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        .anim-sidebar { animation: slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-main { animation: fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; }
        .anim-chat-msg { animation: fadeUpIn 0.3s ease-out forwards; }
        .hover-user-item { transition: all 0.2s; }
        .hover-user-item:hover { transform: translateX(5px); background: rgba(255,255,255,0.05); border-radius: 4px; padding-left: 4px; }
      `}</style>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(circle at center, rgba(15,23,42,0) 0%, rgba(2,6,23,1) 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      ></div>

      <Navbar user={currentUser} />

      <div style={{ ...st.main, position: "relative", zIndex: 1 }}>
        <div style={st.sidebar} className="anim-sidebar">
          <div style={{ padding: "0 5px" }}>
            <h3 style={st.sideTitle}>Workspace: {roomId}</h3>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <span style={st.badge("#22c55e", "#22c55e22")}>{language}</span>
              <span
                style={st.badge(
                  roomSettings.isPublic ? "#38bdf8" : "#facc15",
                  roomSettings.isPublic ? "#38bdf822" : "#facc1522",
                )}
              >
                {roomSettings.isPublic ? "🔓 Public" : "🔒 Private"}
              </span>
            </div>

            {isLeader && (
              <div style={st.leaderCard}>
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: "12px",
                    color: "#facc15",
                    fontWeight: "bold",
                  }}
                >
                  👑 Leader Controls
                </p>
                <button
                  onClick={toggleAccess}
                  style={{
                    ...st.btn,
                    background: roomSettings.isPublic ? "#ef4444" : "#22c55e",
                    fontSize: "12px",
                  }}
                >
                  {roomSettings.isPublic ? "🔒 Make Private" : "🔓 Make Public"}
                </button>
                {pendingRequests.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#facc15",
                        margin: "0 0 6px",
                      }}
                    >
                      Pending ({pendingRequests.length}):
                    </p>
                    {pendingRequests.map((r, i) => (
                      <div key={i} style={st.pendingRequestItem}>
                        <span style={{ fontSize: "12px" }}>{r.username}</span>
                        <div style={{ display: "flex", gap: "5px" }}>
                          <button
                            onClick={() => handleApprove(r.username)}
                            style={st.approveBtn}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleDeny(r.username)}
                            style={st.denyBtn}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p
              style={{
                ...st.roomText,
                marginTop: "15px",
                fontWeight: "bold",
                borderBottom: "1px solid #334155",
                paddingBottom: "5px",
              }}
            >
              Online ({activeUsers.length})
            </p>
            <ul style={st.userList}>
              {activeUsers.map((u, i) => (
                <li
                  key={i}
                  className="hover-user-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "6px",
                    padding: "2px 0",
                    cursor: "default",
                  }}
                >
                  <span
                    style={{
                      ...st.dot,
                      backgroundColor: u.color,
                      animation: "pulseLive 2s infinite",
                    }}
                  ></span>
                  {u.username}
                  {u.username === currentUser.username && (
                    <span style={{ color: "#94a3b8" }}>(You)</span>
                  )}
                  {u.username === roomSettings.creator && (
                    <span style={{ fontSize: "14px" }} title="Room Leader">
                      👑
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <div
              style={{
                marginTop: "15px",
                borderTop: "1px solid #334155",
                paddingTop: "15px",
              }}
            >
              <FileTree
                fileTree={fileTree}
                onSelect={handleFileSelect}
                onCreate={(f) =>
                  socketRef.current?.emit("file-create", { roomId, file: f })
                }
                onRename={(fid, n) =>
                  socketRef.current?.emit("file-rename", {
                    roomId,
                    fileId: fid,
                    newName: n,
                  })
                }
                onDelete={(fid) =>
                  socketRef.current?.emit("file-delete", {
                    roomId,
                    fileId: fid,
                  })
                }
                language={language}
              />
            </div>

            <div style={{ marginTop: "10px" }}>
              <CloudStorage
                roomId={roomId}
                isLeader={isLeader}
                onRestore={(files) => {
                  setFileTree((prev) => ({ ...prev, files }));
                  if (fileTree.activeFileId && editorRef.current) {
                    const activeFile = files.find(
                      (f) => f.id === fileTree.activeFileId,
                    );
                    if (activeFile) {
                      isRemoteUpdate.current = true;
                      editorRef.current.setValue(activeFile.content);
                    }
                  }
                  socketRef.current?.emit("snapshot-restored", {
                    roomId,
                    files,
                  });
                }}
              />
            </div>
          </div>

          <div style={st.chatSection}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <h4 style={st.chatTitle}>Live Chat</h4>
            </div>
            <div style={st.chatBox}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className="anim-chat-msg"
                  style={{
                    marginBottom: "5px",
                    fontSize: "13px",
                    color: msg.isSystem ? "#94a3b8" : "white",
                    fontStyle: msg.isSystem ? "italic" : "normal",
                    wordWrap: "break-word",
                  }}
                >
                  {!msg.isSystem && (
                    <strong
                      style={{
                        color:
                          msg.sender === currentUser.username
                            ? "#38bdf8"
                            : "#22c55e",
                      }}
                    >
                      {msg.sender}:{" "}
                    </strong>
                  )}
                  {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={sendChat} style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                style={st.chatInput}
              />
              <button type="submit" style={st.chatBtn}>
                Send
              </button>
            </form>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          className="anim-main"
        >
          <div style={st.toolbar}>
            <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
              {/* Website Button */}
              <button
                onClick={() => navigate("/")}
                style={{
                  ...st.followBtn,
                  background: "rgba(255,255,255,0.05)",
                  color: "#f8fafc",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                🌍 Website
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(239,68,68,0.1)",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#ef4444",
                    animation: "pulseLive 2s infinite",
                  }}
                ></div>
                <span
                  style={{
                    color: "#ef4444",
                    fontSize: "11px",
                    fontWeight: "bold",
                    letterSpacing: "1px",
                  }}
                >
                  LIVE
                </span>
              </div>
              <button
                onClick={toggleFollowMe}
                style={{
                  ...st.followBtn,
                  background: followMe.active
                    ? isFollowLeader
                      ? "rgba(239, 68, 68, 0.1)"
                      : "rgba(99, 102, 241, 0.1)"
                    : "rgba(56, 189, 248, 0.1)",
                  border: `1px solid ${followMe.active ? (isFollowLeader ? "#ef4444" : "#6366f1") : "#38bdf8"}`,
                  color: followMe.active
                    ? isFollowLeader
                      ? "#ef4444"
                      : "#a5b4fc"
                    : "#38bdf8",
                }}
              >
                {followMe.active
                  ? isFollowLeader
                    ? "⏹ Stop Following Me"
                    : `👁 Following ${followMe.leaderName}`
                  : "📍 Follow Me"}
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <IconButton
                onClick={() => setShowSearchModal(true)}
                bgColor="rgba(14, 165, 233, 0.1)"
                color="#0ea5e9"
                label="Global Search"
                icon={
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                }
              />
              <IconButton
                onClick={handleFormat}
                bgColor="rgba(139, 92, 246, 0.1)"
                color="#a78bfa"
                label="Format Code"
                icon={
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="m21 16-5.16-5.16a2 2 0 0 0-2.82 0L3 21" />
                    <path d="m21 8-5.16 5.16a2 2 0 0 1-2.82 0L3 3" />
                    <path d="M3 16h6" />
                    <path d="M21 3v6h-6" />
                  </svg>
                }
              />
              <IconButton
                onClick={() => setLogs([])}
                bgColor="rgba(250, 204, 21, 0.1)"
                color="#facc15"
                label="Clear Console"
                icon={
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" x2="10" y1="11" y2="17" />
                    <line x1="14" x2="14" y1="11" y2="17" />
                  </svg>
                }
              />
              <IconButton
                onClick={() => setShowSettings(true)}
                bgColor="rgba(148, 163, 184, 0.1)"
                color="#94a3b8"
                label="Editor Settings"
                icon={
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                }
              />
              {isRunning ? (
                <IconButton
                  onClick={handleStopCode}
                  bgColor="rgba(239, 68, 68, 0.15)"
                  color="#ef4444"
                  label="Stop Execution"
                  danger
                  icon={
                    <svg
                      width="18"
                      height="18"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect width="14" height="14" x="5" y="5" rx="2" ry="2" />
                    </svg>
                  }
                />
              ) : (
                <IconButton
                  onClick={handleRunCode}
                  bgColor="rgba(34, 197, 94, 0.15)"
                  color="#22c55e"
                  label="Run Code"
                  icon={
                    <svg
                      width="18"
                      height="18"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  }
                />
              )}
            </div>
          </div>

          <div style={{ flex: 1, position: "relative" }}>
            <Editor
              height="100%"
              width="100%"
              language={editorLang}
              theme="vs-dark"
              onMount={handleEditorMount}
              onChange={handleEditorChange}
              options={{
                fontSize: editorSettings.fontSize,
                minimap: { enabled: editorSettings.minimap },
                wordWrap: editorSettings.wordWrap,
                formatOnPaste: editorSettings.formatOnPaste,
                formatOnType: editorSettings.formatOnType,
                cursorBlinking: "smooth",
                smoothScrolling: true,
                padding: { top: 15 },
              }}
            />
          </div>

          <div
            style={{
              height: "35%",
              background: "#0f172a",
              borderTop: "1px solid #334155",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "10px",
                borderBottom: "1px solid #334155",
                display: "flex",
                gap: "10px",
                background: "#0b1120",
              }}
            >
              <span
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  fontWeight: "bold",
                  alignSelf: "center",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Stdin:
              </span>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Provide standard input here before running (for cin, input(), etc.)"
                style={st.stdinArea}
              />
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                position: "relative",
                padding: "10px",
              }}
            >
              <Console logs={logs} />
            </div>
          </div>
        </div>

        {/* GLOBAL SEARCH MODAL */}
        {showSearchModal && (
          <div style={st.modalOverlay} onClick={() => setShowSearchModal(false)}>
            <div style={st.modalCard} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h3 style={{ margin: 0, color: "#0ea5e9" }}>🔍 Global Search</h3>
                <button onClick={() => setShowSearchModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}>✕</button>
              </div>
              <input type="text" autoFocus value={searchQuery} onChange={(e) => handleGlobalSearch(e.target.value)} placeholder="Search across all files..." style={st.searchInput} />
              <div style={{ flex: 1, overflowY: "auto", borderTop: "1px solid #334155", paddingTop: "10px" }}>
                {searchQuery && searchResults.length === 0 ? (
                  <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>No results found.</div>
                ) : (
                  searchResults.map((res, i) => (
                    <div key={i} onClick={() => jumpToFile(res.fileId)} style={st.searchResultItem}>
                      <div style={{ fontSize: "12px", color: "#38bdf8", marginBottom: "4px", fontWeight: "bold" }}>
                        📄 {res.fileName} <span style={{ color: "#94a3b8", fontWeight: "normal" }}>(Line {res.lineNum})</span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#e2e8f0", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {res.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS MODAL */}
        {showSettings && (
          <div style={st.modalOverlay} onClick={() => setShowSettings(false)}>
            <div style={st.modalCard} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#38bdf8" }}>⚙️ Editor Settings</h3>
                <button onClick={() => setShowSettings(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}>✕</button>
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontSize: "13px", marginBottom: "5px", color: "#94a3b8" }}>
                  Font Size ({editorSettings.fontSize}px)
                </label>
                <input type="range" min="10" max="24" value={editorSettings.fontSize} onChange={(e) => setEditorSettings({ ...editorSettings, fontSize: Number(e.target.value) })} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                  <input type="checkbox" checked={editorSettings.minimap} onChange={(e) => setEditorSettings({ ...editorSettings, minimap: e.target.checked })} />
                  Show Minimap
                </label>
              </div>
              <div style={{ marginBottom: "25px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                  <input type="checkbox" checked={editorSettings.wordWrap === "on"} onChange={(e) => setEditorSettings({ ...editorSettings, wordWrap: e.target.checked ? "on" : "off" })} />
                  Word Wrap
                </label>
              </div>
              <button onClick={() => setShowSettings(false)} style={st.primaryBtn}>Done</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function ensureCursorCSS(socketId, color, username) {
  const c = socketId.replace(/[^a-zA-Z0-9]/g, "");
  if (document.getElementById(`cs-${c}`)) return;
  const style = document.createElement("style");
  style.id = `cs-${c}`;
  style.setAttribute("data-cursor-style", "true");
  style.textContent = `.cur-${c}{border-left:2px solid ${color}!important}.cur-label-${c}::after{content:"${username}";position:absolute;top:-18px;left:0;background:${color};color:white;font-size:10px;padding:2px 6px;border-radius:4px;pointer-events:none;white-space:nowrap;z-index:100;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.3)}.sel-${c}{background-color:${color}33!important}`;
  document.head.appendChild(style);
}
function removeCursorCSS(socketId) {
  const c = socketId.replace(/[^a-zA-Z0-9]/g, "");
  document.getElementById(`cs-${c}`)?.remove();
}

const st = {
  container: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#020617",
  },
  main: { flex: 1, display: "flex", width: "100%", overflow: "hidden" },
  sidebar: {
    width: "300px",
    background: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(12px)",
    color: "white",
    padding: "15px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRight: "1px solid #334155",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  sideTitle: {
    margin: "0 0 10px",
    fontSize: "16px",
    color: "#f8fafc",
    fontWeight: "bold",
  },
  roomText: { margin: "3px 0", fontSize: "13px", color: "#94a3b8" },
  badge: (color, bg) => ({
    fontSize: "11px",
    background: bg,
    color: color,
    padding: "4px 8px",
    borderRadius: "6px",
    fontWeight: "bold",
    border: `1px solid ${color}44`,
  }),
  leaderCard: {
    marginTop: "12px",
    padding: "12px",
    background: "rgba(51, 65, 85, 0.5)",
    borderRadius: "8px",
    border: "1px solid #475569",
  },
  btn: {
    width: "100%",
    padding: "8px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "13px",
    color: "white",
    transition: "transform 0.1s",
  },
  pendingRequestItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#0f172a",
    padding: "6px 10px",
    borderRadius: "6px",
    marginBottom: "4px",
    border: "1px solid #334155",
  },
  approveBtn: {
    background: "rgba(34, 197, 94, 0.2)",
    border: "1px solid #22c55e",
    borderRadius: "4px",
    color: "#22c55e",
    padding: "2px 8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  },
  denyBtn: {
    background: "rgba(239, 68, 68, 0.2)",
    border: "1px solid #ef4444",
    borderRadius: "4px",
    color: "#ef4444",
    padding: "2px 8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  },
  userList: {
    margin: "4px 0 15px",
    paddingLeft: "0",
    fontSize: "13px",
    listStyle: "none",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
    boxShadow: "0 0 5px currentColor",
  },
  chatSection: {
    marginTop: "auto",
    paddingTop: "15px",
    display: "flex",
    flexDirection: "column",
    minHeight: "180px",
  },
  chatTitle: {
    margin: "0",
    fontSize: "14px",
    color: "#f8fafc",
    fontWeight: "bold",
  },
  chatBox: {
    flex: 1,
    background: "rgba(2, 6, 23, 0.5)",
    borderRadius: "8px",
    padding: "10px",
    overflowY: "auto",
    marginBottom: "10px",
    maxHeight: "150px",
    border: "1px solid #334155",
  },
  chatInput: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #475569",
    outline: "none",
    background: "#1e293b",
    color: "white",
    fontSize: "13px",
  },
  chatBtn: {
    background: "#38bdf8",
    border: "none",
    borderRadius: "6px",
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: "bold",
    color: "#0f172a",
    fontSize: "13px",
    transition: "filter 0.2s",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#0b1120",
    padding: "10px 20px",
    borderBottom: "1px solid #334155",
  },
  iconBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  btnHover: {
    ":hover": { filter: "brightness(1.2)", transform: "scale(1.05)" },
  },
  dangerBtnHover: { ":hover": { background: "#ef4444", color: "white" } },
  followBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "12px",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  stdinArea: {
    flex: 1,
    background: "#1e293b",
    color: "#e2e8f0",
    border: "1px solid #475569",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "13px",
    resize: "none",
    height: "40px",
    fontFamily: "monospace",
  },
  centeredScreen: {
    height: "100vh",
    background: "#020617",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  glassCard: {
    background: "rgba(30, 41, 59, 0.7)",
    backdropFilter: "blur(12px)",
    padding: "40px",
    borderRadius: "16px",
    textAlign: "center",
    maxWidth: "400px",
    border: "1px solid rgba(255,255,255,0.05)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  primaryBtn: {
    padding: "12px 24px",
    background: "#38bdf8",
    color: "#0f172a",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    width: "100%",
    transition: "filter 0.2s",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(2, 6, 23, 0.8)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modalCard: {
    background: "#1e293b",
    padding: "25px",
    borderRadius: "16px",
    width: "500px",
    maxWidth: "90%",
    color: "white",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    border: "1px solid #334155",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
  },
  searchInput: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #475569",
    background: "#0f172a",
    color: "white",
    marginBottom: "15px",
    boxSizing: "border-box",
    fontSize: "14px",
  },
  searchResultItem: {
    padding: "10px",
    borderBottom: "1px solid #334155",
    cursor: "pointer",
    borderRadius: "6px",
    transition: "background 0.2s",
  },
};

export default Room;