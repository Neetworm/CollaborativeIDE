import { API_URL } from "../config.js";
import { useNavigate } from "react-router-dom";

function Navbar({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/auth");
  };

  const handleLinkGitHub = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/auth/github/link`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      alert("Could not connect to GitHub");
    }
  };

  const hasGitHub = user?.githubUsername;

  return (
    <div style={styles.navbar}>
      <div style={styles.left}>
        <h2 style={styles.logo}>CodeCollab IDE</h2>
        <p style={styles.text}>Real-Time Collaborative Code Editor</p>
      </div>
      <div style={styles.right}>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {user.githubAvatar && (
              <img
                src={user.githubAvatar}
                alt="avatar"
                style={{ width: "28px", height: "28px", borderRadius: "50%" }}
              />
            )}
            <span style={styles.user}>👤 {user.username}</span>
            {hasGitHub && (
              <span style={styles.githubBadge} title={`GitHub: @${user.githubUsername}`}>
                <svg height="14" viewBox="0 0 16 16" width="14" fill="white">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
              </span>
            )}
          </div>
        )}
        {!hasGitHub && user && (
          <button onClick={handleLinkGitHub} style={styles.githubBtn}>
            <svg height="14" viewBox="0 0 16 16" width="14" fill="white" style={{ marginRight: "4px" }}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Link GitHub
          </button>
        )}
        <button onClick={() => navigate("/")} style={styles.homeBtn}>🏠 Dashboard</button>
        <button onClick={handleLogout} style={styles.logoutBtn}>🚪 Logout</button>
      </div>
    </div>
  );
}

const styles = {
  navbar: { height: "55px", background: "#111827", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", fontFamily: "Arial", borderBottom: "2px solid #1f2937" },
  left: { display: "flex", flexDirection: "column" },
  logo: { margin: 0, fontSize: "18px", fontWeight: "bold", color: "#38bdf8" },
  text: { margin: "2px 0 0", fontSize: "11px", opacity: 0.7 },
  right: { display: "flex", alignItems: "center", gap: "10px" },
  user: { fontSize: "13px", color: "#94a3b8" },
  githubBadge: { background: "#24292e", padding: "4px 6px", borderRadius: "4px", display: "flex", alignItems: "center" },
  githubBtn: { background: "#24292e", color: "white", border: "1px solid #444", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center" },
  homeBtn: { background: "#334155", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" },
  logoutBtn: { background: "#ef4444", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" },
};

export default Navbar;