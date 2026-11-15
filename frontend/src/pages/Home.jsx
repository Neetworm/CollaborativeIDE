import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../config";

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create room form
  const [roomId, setRoomId] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [isPublic, setIsPublic] = useState(true);

  // Join room form
  const [joinRoomId, setJoinRoomId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Delete Safeguard State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, project: null, inputString: "" });

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }

    fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 ? "Unauthorized" : "Server Error");
        return r.json();
      })
      .then((data) => setUser(data.user))
      .catch((err) => {
        if (err.message === "Unauthorized") {
          localStorage.clear();
          navigate("/auth");
        }
      });

    fetchProjects();
  }, [token, navigate]);

  const fetchProjects = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setProjects(data.projects || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load projects");
        setLoading(false);
      });
  };

  const generateId = () => {
    setRoomId(Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  const handleCreateRoom = async () => {
    const rid = roomId.trim() || Math.random().toString(36).substring(2, 8).toUpperCase();
    const t = title.trim() || "Untitled Project";
    const createPromise = fetch(`${API_BASE_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ roomId: rid, title: t, language, isPublic }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate("/room", { state: { roomId: rid, language } });
    });

    toast.promise(createPromise, {
      loading: 'Initializing sandbox...',
      success: 'Workspace created!',
      error: (err) => `Error: ${err.message}`
    });
  };

  const handleJoinRoom = async () => {
    const requestedRoomId = joinRoomId.trim();
    if (!requestedRoomId) return toast.error("Enter a Room ID");

    const joinPromise = fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(requestedRoomId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Room not found.");
      navigate("/room", { state: { roomId: requestedRoomId, language: data.project.language || "JavaScript" } });
    });

    toast.promise(joinPromise, {
      loading: 'Finding room...',
      success: 'Joining workspace...',
      error: (err) => `${err.message}`
    });
  };

  const handleOpenProject = (proj) => {
    navigate("/room", { state: { roomId: proj.roomId, language: proj.language } });
  };

  const initiateDelete = (proj, e) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, project: proj, inputString: "" });
  };

  const executeDeleteProject = async (e) => {
    e.preventDefault();
    if (deleteModal.inputString !== deleteModal.project.roomId) {
      toast.error("Room ID does not match. Deletion aborted.");
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/api/projects/${deleteModal.project.roomId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Project permanently deleted.");
      setDeleteModal({ isOpen: false, project: null, inputString: "" });
      fetchProjects();
    } catch {
      toast.error("Error deleting project");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/auth");
  };

  const getLanguageIcon = (lang) => {
    const icons = {
      JavaScript: { bg: "linear-gradient(135deg, #fef08a, #facc15)", color: "#854d0e", text: "JS" },
      Python: { bg: "linear-gradient(135deg, #bfdbfe, #60a5fa)", color: "#1e3a8a", text: "PY" },
      "C++": { bg: "linear-gradient(135deg, #fecdd3, #fb7185)", color: "#881337", text: "C++" },
      Java: { bg: "linear-gradient(135deg, #fed7aa, #fb923c)", color: "#7c2d12", text: "JA" }
    };
    return icons[lang] || { bg: "#e2e8f0", color: "#334155", text: "{ }" };
  };

  const myProjects = projects.filter((p) => p.creator === user?.username);
  const joinedProjects = projects.filter((p) => p.creator !== user?.username && p.participants?.includes(user?.username));
  const discoverProjects = projects.filter((p) => p.creator !== user?.username && !p.participants?.includes(user?.username) && p.isPublic);

  const getTabProjects = () => {
    let list = [];
    if (activeTab === "all") list = projects;
    else if (activeTab === "mine") list = myProjects;
    else if (activeTab === "joined") list = joinedProjects;
    else if (activeTab === "discover") list = discoverProjects;

    if (searchQuery.trim()) {
      list = list.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.roomId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.creator.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  };

  const filteredProjects = getTabProjects();

  if (loading) return (
    <div style={{ height: "100vh", background: "#020617", display: "flex", justifyContent: "center", alignItems: "center", color: "#38bdf8", fontSize: "20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>Loading Dashboard...</div>
    </div>
  );

  return (
    <div style={st.container}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gridPan { from { background-position: 0 0; } to { background-position: 40px 40px; } }
        @keyframes floatSlow { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        
        .anim-fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        
        .bg-grid { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-size: 40px 40px; background-image: linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px); animation: gridPan 4s linear infinite; z-index: 0; pointer-events: none; }
        
        .hover-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .hover-card:hover { transform: translateY(-5px); border-color: rgba(56, 189, 248, 0.5) !important; box-shadow: 0 20px 40px -10px rgba(56, 189, 248, 0.2); }
        
        .hover-btn { transition: all 0.2s ease; }
        .hover-btn:hover { transform: scale(1.02); filter: brightness(1.1); box-shadow: 0 0 15px rgba(56, 189, 248, 0.3); }
        .hover-btn-danger:hover { transform: scale(1.02); filter: brightness(1.1); box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
      `}</style>

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
        <div className="bg-grid"></div>
        <div style={st.glowOrb1}></div>
        <div style={st.glowOrb2}></div>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* HEADER */}
        <div style={st.header} className="anim-fade-up">
          <div>
            <h1 style={st.logo}>CodeCollab IDE</h1>
            <p style={st.sub}>
              Welcome back, <span style={{ color: "#38bdf8", fontWeight: "bold" }}>{user?.username}</span>
              {user?.githubUsername && <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "8px" }}>(GitHub: @{user.githubUsername})</span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {/* Website Button */}
            <button onClick={() => navigate("/")} style={{ ...st.headerBtn, background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.2)" }} className="hover-btn">
              🌍 Website
            </button>
            <button onClick={() => navigate("/guide")} style={{ ...st.headerBtn, background: "rgba(30, 41, 59, 0.7)", border: "1px solid #334155" }} className="hover-btn">
              📖 Guide
            </button>
            {user?.isAdmin === true && (
              <button onClick={() => navigate("/admin")} style={{ ...st.headerBtn, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }} className="hover-btn">📊 Admin</button>
            )}
            <button onClick={handleLogout} style={{ ...st.headerBtn, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }} className="hover-btn-danger">
              🚪 Logout
            </button>
          </div>
        </div>

        {/* TOP PANELS */}
        <div style={st.topPanels}>
          <div style={st.card} className="anim-fade-up delay-1">
            <div style={st.cardHeader}>
              <h2 style={st.cardTitle}>Create Workspace</h2>
              <span style={{ fontSize: "20px" }}>✨</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="text" placeholder="Room ID (or generate)" value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ ...st.input, flex: 1 }} />
              <button onClick={generateId} style={st.genBtn} className="hover-btn" title="Generate Random ID">🎲</button>
            </div>
            <input type="text" placeholder="Project Title" value={title} onChange={(e) => setTitle(e.target.value)} style={st.input} />
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={st.input}>
              <option value="JavaScript">JavaScript</option>
              <option value="Python">Python</option>
              <option value="C++">C++</option>
              <option value="Java">Java</option>
            </select>
            <label style={st.toggleLabel}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              <span style={{ marginLeft: "8px", transition: "color 0.2s", color: isPublic ? "#10b981" : "#94a3b8", fontWeight: "bold" }}>
                {isPublic ? "🔓 Public Room" : "🔒 Private Room"}
              </span>
            </label>
            <button onClick={handleCreateRoom} style={{...st.primaryBtn, background: "linear-gradient(135deg, #38bdf8, #3b82f6)", color: "white"}} className="hover-btn">
              🚀 Create & Enter
            </button>
          </div>

          <div style={st.card} className="anim-fade-up delay-2">
            <div style={st.cardHeader}>
              <h2 style={st.cardTitle}>Join Existing Room</h2>
              <span style={{ fontSize: "20px" }}>🔗</span>
            </div>
            <input type="text" placeholder="Enter exact Room ID" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} style={st.input} />
            <button onClick={handleJoinRoom} style={{ ...st.primaryBtn, background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }} className="hover-btn">
              Join Workspace
            </button>

            <div style={st.statsGrid}>
              <div style={st.statBox}>
                <span style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>My Projects</span>
                <span style={{ color: "#38bdf8", fontSize: "24px", fontWeight: "900" }}>{myProjects.length}</span>
              </div>
              <div style={st.statBox}>
                <span style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Joined Rooms</span>
                <span style={{ color: "#10b981", fontSize: "24px", fontWeight: "900" }}>{joinedProjects.length}</span>
              </div>
              <div style={st.statBox}>
                <span style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Public Rooms</span>
                <span style={{ color: "#a78bfa", fontSize: "24px", fontWeight: "900" }}>{discoverProjects.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PROJECTS SECTION */}
        <div style={st.projectsSection} className="anim-fade-up delay-3">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ margin: 0, color: "white", fontSize: "22px" }}>
              Project Environment <span style={{ fontSize: "14px", color: "#64748b", marginLeft: "10px", fontWeight: "normal" }}>({filteredProjects.length} shown)</span>
            </h2>
            <input type="text" placeholder="🔍 Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ ...st.input, width: "300px", borderRadius: "20px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(56, 189, 248, 0.3)" }} />
          </div>

          <div style={st.tabBar}>
            {[
              { key: "all", label: `All` },
              { key: "mine", label: `👑 Mine` },
              { key: "joined", label: `✅ Joined` },
              { key: "discover", label: `🌐 Discover` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  ...st.tabBtn,
                  background: activeTab === tab.key ? "rgba(56, 189, 248, 0.1)" : "transparent",
                  color: activeTab === tab.key ? "#38bdf8" : "#94a3b8",
                  borderBottom: activeTab === tab.key ? "2px solid #38bdf8" : "2px solid transparent",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={st.projectGrid}>
            {filteredProjects.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "80px 20px", color: "#64748b", background: "rgba(15, 23, 42, 0.4)", borderRadius: "12px", border: "1px dashed rgba(56,189,248,0.3)" }}>
                <div style={{ fontSize: "50px", display: "inline-block", animation: "floatSlow 4s infinite", marginBottom: "20px" }}>🚀</div>
                <h3 style={{ color: "#f8fafc", margin: "0 0 10px", fontSize: "20px" }}>Your workspace is waiting</h3>
                <p style={{ margin: 0, maxWidth: "400px", marginLeft: "auto", marginRight: "auto", lineHeight: "1.5" }}>
                  {activeTab === "discover" ? "No public projects from other users yet." : activeTab === "joined" ? "You haven't joined any rooms yet." : searchQuery ? "No projects match your search." : "Create a new room above to start collaborating in real-time."}
                </p>
              </div>
            ) : (
              filteredProjects.map((p, index) => {
                const isMyProject = p.creator === user?.username;
                const icon = getLanguageIcon(p.language);

                return (
                  <div key={p.roomId} style={{...st.projectCard, animationDelay: `${index * 0.05}s` }} className="hover-card anim-fade-up" onClick={() => handleOpenProject(p)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                      <div style={{ width: "45px", height: "45px", borderRadius: "12px", background: icon.bg, color: icon.color, display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "900", fontSize: "14px", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}>
                        {icon.text}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {isMyProject && <span style={st.badge("#facc15", "rgba(250, 204, 21, 0.15)", "1px solid rgba(250, 204, 21, 0.3)")}>👑</span>}
                        <span style={st.badge(p.isPublic ? "#10b981" : "#ef4444", p.isPublic ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", p.isPublic ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)")}>
                          {p.isPublic ? "🔓" : "🔒"}
                        </span>
                      </div>
                    </div>
                    <h3 style={{ margin: "0 0 5px 0", color: "#f8fafc", fontSize: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</h3>
                    <p style={{ margin: "0 0 15px 0", color: "#94a3b8", fontSize: "13px" }}>Room ID: <span style={{ color: "#38bdf8", fontWeight: "bold", background: "rgba(56,189,248,0.1)", padding: "2px 6px", borderRadius: "4px" }}>{p.roomId}</span></p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "15px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ color: "#64748b", fontSize: "12px" }}>
                        By {isMyProject ? <span style={{ color: "#f8fafc", fontWeight: "bold" }}>You</span> : <span style={{ color: "#94a3b8" }}>{p.creator}</span>}
                      </span>
                      {isMyProject && (
                        <button onClick={(e) => initiateDelete(p, e)} style={st.delBtn} title="Delete project">
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* DELETE SAFEGUARD MODAL */}
      {deleteModal.isOpen && (
        <div style={st.modalOverlay} onClick={() => setDeleteModal({ isOpen: false, project: null, inputString: "" })}>
          <div style={st.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#ef4444", fontSize: "22px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span>⚠️</span> Delete Project
              </h3>
              <button onClick={() => setDeleteModal({ isOpen: false, project: null, inputString: "" })} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "20px" }}>✕</button>
            </div>
            <p style={{ color: "#e2e8f0", fontSize: "15px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
              This action cannot be undone. This will permanently delete the project <strong>{deleteModal.project?.title}</strong> and all its files.
            </p>
            <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "10px" }}>
              Please type <strong>{deleteModal.project?.roomId}</strong> to confirm.
            </p>
            <form onSubmit={executeDeleteProject}>
              <input 
                type="text" 
                value={deleteModal.inputString} 
                onChange={(e) => setDeleteModal({ ...deleteModal, inputString: e.target.value })} 
                placeholder={deleteModal.project?.roomId}
                style={{...st.input, border: "1px solid #475569", marginBottom: "20px"}} 
                autoFocus 
                required 
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setDeleteModal({ isOpen: false, project: null, inputString: "" })} style={{ flex: 1, ...st.primaryBtn, background: "#334155", color: "white" }}>Cancel</button>
                <button type="submit" disabled={deleteModal.inputString !== deleteModal.project?.roomId} style={{ flex: 1, ...st.primaryBtn, background: deleteModal.inputString === deleteModal.project?.roomId ? "#ef4444" : "rgba(239, 68, 68, 0.3)", color: "white", cursor: deleteModal.inputString === deleteModal.project?.roomId ? "pointer" : "not-allowed" }}>
                  Permanently Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  container: { position: "relative", minHeight: "100vh", background: "#020617", padding: "30px 40px", color: "white", fontFamily: "system-ui, -apple-system, sans-serif", overflowX: "hidden" },
  glowOrb1: { position: "absolute", top: "-10%", left: "-10%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(56,189,248,0.1) 0%, rgba(0,0,0,0) 70%)", filter: "blur(40px)", zIndex: 0 },
  glowOrb2: { position: "absolute", top: "40%", right: "-10%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(0,0,0,0) 70%)", filter: "blur(40px)", zIndex: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" },
  logo: { margin: "0", fontSize: "32px", color: "#38bdf8", fontWeight: "800", letterSpacing: "-1px" },
  sub: { margin: "5px 0 0", fontSize: "14px", color: "#94a3b8" },
  headerBtn: { color: "white", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", transition: "all 0.2s" },
  topPanels: { display: "flex", gap: "25px", marginBottom: "40px", flexWrap: "wrap" },
  card: { background: "linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.9) 100%)", backdropFilter: "blur(12px)", padding: "30px", borderRadius: "16px", flex: "1", minWidth: "300px", display: "flex", flexDirection: "column", gap: "15px", border: "1px solid rgba(255, 255, 255, 0.05)", borderTop: "1px solid rgba(56, 189, 248, 0.3)", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" },
  cardTitle: { margin: "0", fontSize: "20px", color: "#f8fafc" },
  input: { padding: "12px 16px", borderRadius: "10px", border: "1px solid #334155", background: "rgba(2, 6, 23, 0.6)", color: "white", fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s" },
  genBtn: { padding: "10px 14px", borderRadius: "10px", border: "1px solid #334155", background: "rgba(2, 6, 23, 0.6)", color: "white", cursor: "pointer", fontSize: "18px", flexShrink: 0 },
  primaryBtn: { padding: "14px", borderRadius: "10px", border: "none", fontSize: "15px", fontWeight: "bold", cursor: "pointer", marginTop: "10px", transition: "all 0.2s" },
  toggleLabel: { display: "flex", alignItems: "center", fontSize: "14px", cursor: "pointer", userSelect: "none" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "20px" },
  statBox: { background: "rgba(15, 23, 42, 0.6)", padding: "15px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)" },
  projectsSection: { background: "linear-gradient(145deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.8) 100%)", backdropFilter: "blur(12px)", borderRadius: "16px", padding: "30px", border: "1px solid rgba(255, 255, 255, 0.05)", borderTop: "1px solid rgba(56, 189, 248, 0.2)" },
  tabBar: { display: "flex", borderBottom: "1px solid #334155", marginBottom: "25px", gap: "10px" },
  tabBtn: { padding: "12px 20px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600", borderRadius: "8px 8px 0 0", transition: "all 0.2s" },
  projectGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "25px", maxHeight: "600px", overflowY: "auto", paddingRight: "10px", paddingBottom: "20px" },
  projectCard: { background: "linear-gradient(145deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,1) 100%)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", flexDirection: "column", boxShadow: "0 10px 20px rgba(0,0,0,0.3)" },
  badge: (color, bg, border) => ({ fontSize: "11px", background: bg, color: color, padding: "4px 10px", borderRadius: "20px", fontWeight: "bold", border: border }),
  delBtn: { background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", cursor: "pointer", fontSize: "14px", padding: "6px", transition: "all 0.2s", color: "#ef4444" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(2, 6, 23, 0.8)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 },
  modalCard: { background: "#1e293b", padding: "30px", borderRadius: "16px", width: "450px", maxWidth: "90%", border: "1px solid rgba(239, 68, 68, 0.3)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", animation: "fadeUp 0.3s ease-out forwards" },
};

export default Home;