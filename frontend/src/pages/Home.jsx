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
      loading: 'Creating room...',
      success: 'Room created!',
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
      success: 'Joining room...',
      error: (err) => `${err.message}`
    });
  };

  const handleOpenProject = (proj) => {
    navigate("/room", { state: { roomId: proj.roomId, language: proj.language } });
  };

  const handleDeleteProject = async (rid) => {
    if (!window.confirm("Delete this project permanently?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/projects/${rid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Project deleted");
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
      JavaScript: { bg: "#fef08a", color: "#854d0e", text: "JS" },
      Python: { bg: "#bfdbfe", color: "#1e40af", text: "PY" },
      "C++": { bg: "#fecdd3", color: "#9f1239", text: "C++" },
      Java: { bg: "#fed7aa", color: "#9a3412", text: "JA" }
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
    <div style={{ height: "100vh", background: "#020617", display: "flex", justifyContent: "center", alignItems: "center", color: "#38bdf8", fontSize: "20px" }}>
      <div style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>Initializing Workspace...</div>
    </div>
  );

  return (
    <div style={st.container}>
      <div style={st.glowOrb1}></div>
      <div style={st.glowOrb2}></div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* HEADER */}
        <div style={st.header}>
          <div>
            <h1 style={st.logo}>CodeCollab IDE</h1>
            <p style={st.sub}>
              Welcome back, <span style={{ color: "#38bdf8", fontWeight: "bold" }}>{user?.username}</span>
              {user?.githubUsername && <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "8px" }}>(GitHub: @{user.githubUsername})</span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => navigate("/guide")} style={{ ...st.headerBtn, background: "#1e293b", border: "1px solid #334155" }}>
              📖 Guide
            </button>
            {user?.isAdmin === true && (
              <button onClick={() => navigate("/admin")} style={{ ...st.headerBtn, background: "#6366f1" }}>📊 Admin</button>
            )}
            <button onClick={handleLogout} style={{ ...st.headerBtn, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
              🚪 Logout
            </button>
          </div>
        </div>

        {/* TOP PANELS */}
        <div style={st.topPanels}>
          {/* CREATE ROOM */}
          <div style={st.card}>
            <div style={st.cardHeader}>
              <h2 style={st.cardTitle}>Create New Room</h2>
              <span style={{ fontSize: "20px" }}>✨</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="text" placeholder="Room ID (or generate)" value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ ...st.input, flex: 1 }} />
              <button onClick={generateId} style={st.genBtn} title="Generate Random ID">🎲</button>
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
              <span style={{ marginLeft: "8px" }}>Public Room {isPublic ? "🔓" : "🔒"}</span>
            </label>
            <button onClick={handleCreateRoom} style={st.primaryBtn}>🚀 Create & Enter</button>
          </div>

          {/* JOIN ROOM */}
          <div style={st.card}>
            <div style={st.cardHeader}>
              <h2 style={st.cardTitle}>Join Existing Room</h2>
              <span style={{ fontSize: "20px" }}>🔗</span>
            </div>
            <input type="text" placeholder="Enter Room ID" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} style={st.input} />
            <button onClick={handleJoinRoom} style={{ ...st.primaryBtn, background: "#10b981", color: "white" }}>Join Room</button>

            {/* Quick Stats Grid */}
            <div style={st.statsGrid}>
              <div style={st.statBox}>
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>My Projects</span>
                <span style={{ color: "#38bdf8", fontSize: "20px", fontWeight: "bold" }}>{myProjects.length}</span>
              </div>
              <div style={st.statBox}>
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>Joined Rooms</span>
                <span style={{ color: "#10b981", fontSize: "20px", fontWeight: "bold" }}>{joinedProjects.length}</span>
              </div>
              <div style={st.statBox}>
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>Public Rooms</span>
                <span style={{ color: "#a78bfa", fontSize: "20px", fontWeight: "bold" }}>{discoverProjects.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PROJECTS SECTION */}
        <div style={st.projectsSection}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, color: "white", fontSize: "22px" }}>
              Workspace <span style={{ fontSize: "14px", color: "#64748b", marginLeft: "10px", fontWeight: "normal" }}>({filteredProjects.length} shown)</span>
            </h2>
            <input type="text" placeholder="🔍 Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ ...st.input, width: "300px", borderRadius: "20px" }} />
          </div>

          {/* Tabs */}
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

          {/* Project Grid */}
          <div style={st.projectGrid}>
            {filteredProjects.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
                <span style={{ fontSize: "40px", display: "block", marginBottom: "15px" }}>📂</span>
                {activeTab === "discover" ? "No public projects from other users yet." : activeTab === "joined" ? "You haven't joined any rooms yet." : searchQuery ? "No projects match your search." : "No projects yet. Create your first room!"}
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isMyProject = p.creator === user?.username;
                const icon = getLanguageIcon(p.language);

                return (
                  <div key={p.roomId} style={st.projectCard} onClick={() => handleOpenProject(p)}>
                    
                    {/* Card Header (Icon + Status) */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: icon.bg, color: icon.color, display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", fontSize: "14px" }}>
                        {icon.text}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {isMyProject && <span style={st.badge("#facc15", "#facc1522")}>👑</span>}
                        <span style={st.badge(p.isPublic ? "#10b981" : "#ef4444", p.isPublic ? "#10b98122" : "#ef444422")}>
                          {p.isPublic ? "🔓" : "🔒"}
                        </span>
                      </div>
                    </div>

                    {/* Project Title & Metadata */}
                    <h3 style={{ margin: "0 0 5px 0", color: "#f8fafc", fontSize: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</h3>
                    <p style={{ margin: "0 0 15px 0", color: "#94a3b8", fontSize: "13px" }}>ID: <span style={{ color: "#cbd5e1" }}>{p.roomId}</span></p>
                    
                    {/* Footer (Creator & Delete) */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "15px", borderTop: "1px solid #334155" }}>
                      <span style={{ color: "#64748b", fontSize: "12px" }}>
                        By {isMyProject ? "You" : <span style={{ color: "#94a3b8" }}>{p.creator}</span>}
                      </span>
                      {isMyProject && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.roomId); }} style={st.delBtn} title="Delete project">
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
  headerBtn: { color: "white", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", transition: "transform 0.1s" },
  topPanels: { display: "flex", gap: "25px", marginBottom: "40px", flexWrap: "wrap" },
  card: { background: "rgba(30, 41, 59, 0.7)", backdropFilter: "blur(12px)", padding: "30px", borderRadius: "16px", flex: "1", minWidth: "300px", display: "flex", flexDirection: "column", gap: "15px", border: "1px solid rgba(255, 255, 255, 0.05)", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" },
  cardTitle: { margin: "0", fontSize: "20px", color: "#f8fafc" },
  input: { padding: "12px 16px", borderRadius: "10px", border: "1px solid #334155", background: "#0f172a", color: "white", fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s" },
  genBtn: { padding: "10px 14px", borderRadius: "10px", border: "1px solid #334155", background: "#0f172a", color: "white", cursor: "pointer", fontSize: "18px", flexShrink: 0 },
  primaryBtn: { padding: "14px", borderRadius: "10px", border: "none", background: "#38bdf8", color: "#0f172a", fontSize: "15px", fontWeight: "bold", cursor: "pointer", marginTop: "10px", transition: "filter 0.2s" },
  toggleLabel: { display: "flex", alignItems: "center", fontSize: "14px", color: "#94a3b8", cursor: "pointer", userSelect: "none" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "20px" },
  statBox: { background: "#0f172a", padding: "15px", borderRadius: "10px", border: "1px solid #334155", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" },
  projectsSection: { background: "rgba(30, 41, 59, 0.5)", backdropFilter: "blur(12px)", borderRadius: "16px", padding: "30px", border: "1px solid rgba(255, 255, 255, 0.05)" },
  tabBar: { display: "flex", borderBottom: "1px solid #334155", marginBottom: "25px", gap: "10px" },
  tabBtn: { padding: "12px 20px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600", borderRadius: "8px 8px 0 0", transition: "all 0.2s" },
  projectGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px", maxHeight: "600px", overflowY: "auto", paddingRight: "10px" },
  projectCard: { background: "#0f172a", padding: "20px", borderRadius: "12px", border: "1px solid #334155", cursor: "pointer", transition: "transform 0.1s, border-color 0.2s", display: "flex", flexDirection: "column" },
  badge: (color, bg) => ({ fontSize: "12px", background: bg, color: color, padding: "4px 8px", borderRadius: "6px", fontWeight: "bold", border: `1px solid ${color}44` }),
  delBtn: { background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", cursor: "pointer", fontSize: "14px", padding: "6px", transition: "background 0.2s" },
};

export default Home;