import { useNavigate } from "react-router-dom";

function Guide() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <h1 style={s.title}>CodeCollab Documentation</h1>
          <button onClick={() => navigate("/dashboard")} style={s.backBtn}>← Back to Dashboard</button>
        </div>

        <div style={s.section}>
          <h2 style={s.heading}>1. Account & Security</h2>
          <p style={s.text}>
            CodeCollab operates on a zero-email security architecture. When you register, you are issued a unique <strong>Recovery Key (e.g., CC-XXXX)</strong>. 
            This key is permanently stored in your dashboard. If you forget your password, this key is the <em>only</em> way to regain access to your account.
          </p>
        </div>

        <div style={s.section}>
          <h2 style={s.heading}>2. Private vs. Public Rooms</h2>
          <ul style={s.list}>
            <li style={s.text}><strong>Public Rooms:</strong> Anyone with the Room ID can join instantly and begin collaborating.</li>
            <li style={s.text}><strong>Private Rooms:</strong> Users attempting to join via Room ID are placed in a waiting state. The room creator receives a live notification and must approve or deny the request.</li>
          </ul>
        </div>

        <div style={s.section}>
          <h2 style={s.heading}>3. Real-Time Collaboration</h2>
          <ul style={s.list}>
            <li style={s.text}><strong>Follow-Me Mode:</strong> The room leader can toggle Follow-Me mode (📍). When active, all participants' screens will automatically scroll and switch files to follow the leader's exact view.</li>
            <li style={s.text}><strong>File Management:</strong> Only the room creator or the user who originally created a specific file can delete it.</li>
            <li style={s.text}><strong>Live Execution:</strong> The code sandbox compiles and runs your files in real-time. If your code requires inputs, type them into the Standard Input box before clicking Run.</li>
          </ul>
        </div>

        <div style={s.section}>
          <h2 style={s.heading}>4. Multi-Tab Support</h2>
          <p style={s.text}>
            You can safely open the same room across multiple browser tabs or split-screen windows. CodeCollab will keep your connection alive until your <em>last</em> active tab is closed.
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", padding: "40px 20px", fontFamily: "system-ui, -apple-system, sans-serif" },
  container: { maxWidth: "800px", margin: "0 auto", background: "#1e293b", padding: "40px", borderRadius: "16px", border: "1px solid #334155", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: "20px", marginBottom: "30px" },
  title: { margin: 0, color: "#38bdf8", fontSize: "28px" },
  backBtn: { background: "transparent", border: "1px solid #38bdf8", color: "#38bdf8", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" },
  section: { marginBottom: "35px" },
  heading: { color: "#f8fafc", fontSize: "20px", marginBottom: "12px", borderLeft: "4px solid #38bdf8", paddingLeft: "10px" },
  text: { fontSize: "15px", lineHeight: "1.6", color: "#94a3b8", margin: "0 0 10px 0" },
  list: { margin: "10px 0", paddingLeft: "20px" },
};

export default Guide;