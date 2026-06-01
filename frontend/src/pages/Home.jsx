import { API_URL } from "../config.js";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Active tab for project sections
  const [activeTab, setActiveTab] = useState("all");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/auth"); return; }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setUser(data.user))
      .catch(() => { localStorage.clear(); navigate("/auth"); });

    fetchProjects();
  }, [token, navigate]);

  const fetchProjects = () => {
    setLoading(true);
    fetch(`${API_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setProjects(data.projects || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const generateId = () => {
    setRoomId(Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  const handleCreateRoom = async () => {
    const rid = roomId.trim() || Math.random().toString(36).substring(2, 8).toUpperCase();
    const t = title.trim() || "Untitled Project";
    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomId: rid, title: t, language, isPublic })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      navigate("/room", { state: { roomId: rid, language } });
    } catch (err) {
      alert("Error creating room");
    }
  };

  const handleJoinRoom = async () => {
    if (!joinRoomId.trim()) { alert("Enter a Room ID"); return; }
    try {
      const res = await fetch(`${API_URL}/api/projects/${joinRoomId.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        navigate("/room", { state: { roomId: joinRoomId.trim(), language: data.project.language } });
      } else {
        if (window.confirm("Room not found. Create it as a new public room?")) {
          await fetch(`${API_URL}/api/projects`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ roomId: joinRoomId.trim(), title: `Room ${joinRoomId.trim()}`, language: "JavaScript", isPublic: true })
          });
          navigate("/room", { state: { roomId: joinRoomId.trim(), language: "JavaScript" } });
        }
      }
    } catch {
      alert("Error connecting to server");
    }
  };

  const handleOpenProject = (proj) => {
    navigate("/room", { state: { roomId: proj.roomId, language: proj.language } });
  };

  const handleDeleteProject = async (rid) => {
    if (!window.confirm("Delete this project permanently?")) return;
    try {
      await fetch(`${API_URL}/api/projects/${rid}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
      fetchProjects();
    } catch { alert("Error deleting"); }
  };

  const handleLogout = () => { localStorage.clear(); navigate("/auth"); };

  // ==================== PROJECT CATEGORIZATION ====================
  const myProjects = projects.filter(p => p.creator === user?.username);

  const joinedProjects = projects.filter(p =>
    p.creator !== user?.username &&
    p.participants?.includes(user?.username)
  );

  const discoverProjects = projects.filter(p =>
    p.creator !== user?.username &&
    !p.participants?.includes(user?.username) &&
    p.isPublic
  );

  // Filter based on active tab
  const getTabProjects = () => {
    let list = [];
    if (activeTab === "all") list = projects;
    else if (activeTab === "mine") list = myProjects;
    else if (activeTab === "joined") list = joinedProjects;
    else if (activeTab === "discover") list = discoverProjects;

    // Apply search filter
    if (searchQuery.trim()) {
      list = list.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.roomId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.creator.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return list;
  };

  const filteredProjects = getTabProjects();

  if (loading) return (
    <div style={{ height: "100vh", background: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center", color: "#38bdf8", fontSize: "20px" }}>
      Loading...
    </div>
  );

  return (
    <div style={st.container}>

      {/* HEADER */}
      <div style={st.header}>
        <div>
          <h1 style={st.logo}>CodeCollab IDE</h1>
          <p style={st.sub}>
            Welcome back, <span style={{ color: "#38bdf8" }}>{user?.username}</span>
            {user?.githubUsername && (
              <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "8px" }}>
                (GitHub: @{user.githubUsername})
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => navigate("/admin")} style={{ ...st.headerBtn, background: "#6366f1" }}>📊 Admin</button>
          <button onClick={handleLogout} style={{ ...st.headerBtn, background: "#ef4444" }}>🚪 Logout</button>
        </div>
      </div>

      {/* TOP PANELS: Create + Join */}
      <div style={st.topPanels}>

        {/* CREATE ROOM */}
        <div style={st.card}>
          <h2 style={st.cardTitle}>Create New Room</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text" placeholder="Room ID (or generate)"
              value={roomId} onChange={e => setRoomId(e.target.value)}
              style={{ ...st.input, flex: 1 }}
            />
            <button onClick={generateId} style={st.genBtn} title="Generate Random ID">🎲</button>
          </div>
          <input
            type="text" placeholder="Project Title"
            value={title} onChange={e => setTitle(e.target.value)}
            style={st.input}
          />
          <select value={language} onChange={e => setLanguage(e.target.value)} style={st.input}>
            <option value="JavaScript">JavaScript</option>
            <option value="Python">Python</option>
            <option value="C++">C++</option>
            <option value="Java">Java</option>
          </select>
          <label style={st.toggleLabel}>
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            <span style={{ marginLeft: "8px" }}>
              Public Room {isPublic ? "🔓" : "🔒"}
            </span>
          </label>
          <button onClick={handleCreateRoom} style={st.primaryBtn}>🚀 Create & Enter</button>
        </div>

        {/* JOIN ROOM */}
        <div style={st.card}>
          <h2 style={st.cardTitle}>Join Existing Room</h2>
          <input
            type="text" placeholder="Enter Room ID"
            value={joinRoomId} onChange={e => setJoinRoomId(e.target.value)}
            style={st.input}
          />
          <button onClick={handleJoinRoom} style={{ ...st.primaryBtn, background: "#22c55e" }}>
            🔗 Join Room
          </button>

          {/* Stats */}
          <div style={{ marginTop: "20px", borderTop: "1px solid #334155", paddingTop: "15px" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "14px", color: "#94a3b8" }}>Platform Status</h3>
            <div style={st.statRow}><span>Server:</span> <span style={{ color: "#22c55e" }}>🟢 Online</span></div>
            <div style={st.statRow}><span>Database:</span> <span style={{ color: "#22c55e" }}>🟢 Connected</span></div>
            <div style={st.statRow}><span>Auth:</span> <span style={{ color: "#22c55e" }}>🟢 {user?.username}</span></div>
          </div>

          {/* Quick Stats */}
          <div style={{ marginTop: "15px", borderTop: "1px solid #334155", paddingTop: "15px" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "14px", color: "#94a3b8" }}>Your Stats</h3>
            <div style={st.statRow}>
              <span>My Projects:</span>
              <span style={{ color: "#38bdf8", fontWeight: "bold" }}>{myProjects.length}</span>
            </div>
            <div style={st.statRow}>
              <span>Joined:</span>
              <span style={{ color: "#22c55e", fontWeight: "bold" }}>{joinedProjects.length}</span>
            </div>
            <div style={st.statRow}>
              <span>Discover:</span>
              <span style={{ color: "#a78bfa", fontWeight: "bold" }}>{discoverProjects.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PROJECTS SECTION */}
      <div style={st.projectsSection}>

        {/* Section Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h2 style={{ margin: 0, color: "white", fontSize: "20px" }}>
            Projects
            <span style={{ fontSize: "14px", color: "#64748b", marginLeft: "10px" }}>
              ({filteredProjects.length} shown)
            </span>
          </h2>
          <input
            type="text"
            placeholder="🔍 Search by title, ID or creator..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...st.input, width: "280px" }}
          />
        </div>

        {/* Tabs */}
        <div style={st.tabBar}>
          {[
            { key: "all", label: `All (${projects.length})` },
            { key: "mine", label: `👑 Mine (${myProjects.length})` },
            { key: "joined", label: `✅ Joined (${joinedProjects.length})` },
            { key: "discover", label: `🌐 Discover (${discoverProjects.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...st.tabBtn,
                background: activeTab === tab.key ? "#334155" : "transparent",
                color: activeTab === tab.key ? "#38bdf8" : "#94a3b8",
                borderBottom: activeTab === tab.key ? "2px solid #38bdf8" : "2px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Project List */}
        <div style={st.projectGrid}>
          {filteredProjects.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b", width: "100%" }}>
              {activeTab === "discover"
                ? "No public projects from other users yet."
                : activeTab === "joined"
                ? "You haven't joined any rooms yet. Discover public rooms above!"
                : searchQuery
                ? "No projects match your search."
                : "No projects yet. Create your first room!"}
            </div>
          ) : (
            filteredProjects.map(p => {
              const isMyProject = p.creator === user?.username;
              const isJoined = p.participants?.includes(user?.username);
              const isDiscover = !isMyProject && !isJoined;

              return (
                <div key={p.roomId} style={st.projectItem}>

                  {/* Left: Info */}
                  <div style={st.projectInfo} onClick={() => handleOpenProject(p)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ color: "#38bdf8", fontSize: "15px" }}>{p.title}</strong>

                      {/* Badges */}
                      {isMyProject && (
                        <span style={st.badge("#facc15", "#facc1533")}>👑 Owner</span>
                      )}
                      {isJoined && !isMyProject && (
                        <span style={st.badge("#22c55e", "#22c55e33")}>✅ Joined</span>
                      )}
                      {isDiscover && (
                        <span style={st.badge("#a78bfa", "#a78bfa33")}>🌐 Public</span>
                      )}
                      <span style={st.badge(
                        p.isPublic ? "#22c55e" : "#ef4444",
                        p.isPublic ? "#22c55e22" : "#ef444422"
                      )}>
                        {p.isPublic ? "🔓 Public" : "🔒 Private"}
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                      <span>{p.language}</span>
                      <span style={{ margin: "0 8px", color: "#334155" }}>•</span>
                      <span>ID: <strong style={{ color: "#64748b" }}>{p.roomId}</strong></span>
                      <span style={{ margin: "0 8px", color: "#334155" }}>•</span>
                      <span>By: <strong style={{ color: "#94a3b8" }}>{p.creator}</strong></span>
                      <span style={{ margin: "0 8px", color: "#334155" }}>•</span>
                      <span>{new Date(p.updatedAt || p.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      onClick={() => handleOpenProject(p)}
                      style={st.openBtn}
                    >
                      {isDiscover ? "👁 View" : "▶ Open"}
                    </button>
                    {isMyProject && (
                      <button
                        onClick={() => handleDeleteProject(p.roomId)}
                        style={st.delBtn}
                        title="Delete project"
                      >
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
  );
}

const st = {
  container: { minHeight: "100vh", background: "#0f172a", padding: "30px 40px", color: "white", fontFamily: "Arial" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
  logo: { margin: "0", fontSize: "32px", color: "#38bdf8" },
  sub: { margin: "5px 0 0", fontSize: "14px", color: "#94a3b8" },
  headerBtn: { color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" },
  topPanels: { display: "flex", gap: "20px", marginBottom: "30px", flexWrap: "wrap" },
  card: { background: "#1e293b", padding: "25px", borderRadius: "12px", flex: "1", minWidth: "280px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" },
  cardTitle: { margin: "0 0 8px", fontSize: "18px", borderBottom: "1px solid #334155", paddingBottom: "8px" },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white", fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box" },
  genBtn: { padding: "10px 14px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white", cursor: "pointer", fontSize: "16px", flexShrink: 0 },
  primaryBtn: { padding: "12px", borderRadius: "8px", border: "none", background: "#38bdf8", color: "#0f172a", fontSize: "15px", fontWeight: "bold", cursor: "pointer" },
  toggleLabel: { display: "flex", alignItems: "center", fontSize: "14px", color: "#94a3b8", cursor: "pointer" },
  statRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "bold", marginBottom: "8px" },
  projectsSection: { background: "#1e293b", borderRadius: "12px", padding: "25px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" },
  tabBar: { display: "flex", borderBottom: "1px solid #334155", marginBottom: "20px", gap: "0" },
  tabBtn: { padding: "10px 20px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "bold", transition: "all 0.15s" },
  projectGrid: { display: "flex", flexDirection: "column", gap: "10px", maxHeight: "500px", overflowY: "auto" },
  projectItem: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", padding: "15px 20px", borderRadius: "10px", cursor: "pointer", transition: "background 0.15s", border: "1px solid #1e293b" },
  projectInfo: { display: "flex", flexDirection: "column", gap: "4px", flex: 1 },
  badge: (color, bg) => ({ fontSize: "11px", background: bg, color: color, padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }),
  openBtn: { background: "#334155", color: "white", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold", whiteSpace: "nowrap" },
  delBtn: { background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px" },
};

export default Home;