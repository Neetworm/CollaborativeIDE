import { useEffect, useRef } from "react";

function Console({ logs = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getColor = (entry) => {
    if (typeof entry === "string") {
      if (entry.includes("✖")) return "#ef4444";
      if (entry.includes("⚠")) return "#facc15";
      return "#22c55e";
    }
    // Streaming entry: { type, data }
    switch (entry.type) {
      case "stderr": return "#ef4444";
      case "exit":   return "#94a3b8";
      case "info":   return "#38bdf8";
      default:       return "#22c55e";
    }
  };

  const getText = (entry) => {
    if (typeof entry === "string") return entry;
    return entry.data;
  };

  return (
    <div style={styles.console}>
      <h3 style={styles.heading}>Output Console</h3>
      <div style={styles.outputBox}>
        {logs.length === 0 ? (
          <p style={{ color: "#22c55e" }}>✔ System ready. Press "Run Code" to execute.</p>
        ) : (
          logs.map((entry, i) => (
            <span key={i} style={{ color: getColor(entry), whiteSpace: "pre-wrap" }}>
              {getText(entry)}
            </span>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const styles = {
  console: { height:"100%",background:"#111827",color:"white",padding:"10px 15px",fontFamily:"monospace",borderTop:"2px solid #1f2937",display:"flex",flexDirection:"column" },
  heading: { margin:"0 0 8px",fontSize:"14px",fontWeight:"bold",color:"#38bdf8" },
  outputBox: { flex:1,background:"#0f172a",padding:"10px",borderRadius:"8px",overflowY:"auto",fontSize:"13px",lineHeight:"1.5" },
};

export default Console;