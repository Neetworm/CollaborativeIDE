import { API_URL } from "../config.js";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function AdminDashboard() {
  const [data, setData] = useState({ rooms: {}, users: {} });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = () => {
      fetch(`${API_URL}/api/analytics`)
        .then(r => r.json())
        .then(setData)
        .catch(() => {});
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={{margin:0,color:"#38bdf8"}}>📊 eWatcher — Admin Dashboard</h1>
        <button onClick={() => navigate("/")} style={s.backBtn}>← Back</button>
      </div>

      {Object.keys(data.rooms).length === 0 ? (
        <p style={{color:"#94a3b8",textAlign:"center",marginTop:"60px",fontSize:"18px"}}>No active rooms. Waiting for data...</p>
      ) : (
        Object.entries(data.rooms).map(([roomId, users]) => (
          <div key={roomId} style={s.card}>
            <h2 style={{margin:"0 0 15px",color:"#38bdf8"}}>Room: {roomId}
              <span style={{fontSize:"14px",color:"#94a3b8",marginLeft:"10px"}}>
                ({data.users[roomId]?.length || 0} online)
              </span>
            </h2>
            <table style={s.table}>
              <thead>
                <tr>{["User","Edits","✅ Builds","❌ Fails","Error Streak","Max Streak","Last Active"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {Object.entries(users).map(([user, stats]) => (
                  <tr key={user}>
                    <td style={s.td}><b>{user}</b></td>
                    <td style={s.td}>{stats.totalEdits}</td>
                    <td style={{...s.td,color:"#22c55e"}}>{stats.successfulBuilds}</td>
                    <td style={{...s.td,color:"#ef4444"}}>{stats.failedBuilds}</td>
                    <td style={{...s.td,color:stats.errorStreak>=5?"#ef4444":"#facc15"}}>{stats.errorStreak}</td>
                    <td style={s.td}>{stats.maxErrorStreak}</td>
                    <td style={{...s.td,fontSize:"11px",color:"#94a3b8"}}>{new Date(stats.lastActivity).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

const s = {
  page: { minHeight:"100vh",background:"#0f172a",color:"white",padding:"30px",fontFamily:"Arial" },
  header: { display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"30px" },
  backBtn: { background:"#334155",color:"white",border:"none",padding:"8px 16px",borderRadius:"6px",cursor:"pointer",fontWeight:"bold" },
  card: { background:"#1e293b",borderRadius:"12px",padding:"20px",marginBottom:"20px",boxShadow:"0 4px 12px rgba(0,0,0,0.3)" },
  table: { width:"100%",borderCollapse:"collapse" },
  th: { textAlign:"left",padding:"8px 12px",borderBottom:"2px solid #334155",color:"#94a3b8",fontSize:"13px" },
  td: { padding:"8px 12px",borderBottom:"1px solid #334155",fontSize:"14px" },
};

export default AdminDashboard;