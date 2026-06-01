import { API_URL } from "../config.js";
import { useState, useEffect, useRef } from "react";

function CloudStorage({ roomId, isLeader, onRestore }) {
  const [activeTab, setActiveTab] = useState("uploads");
  const [uploads, setUploads] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);
  const token = localStorage.getItem("token");

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchUploads();
    fetchSnapshots();
  }, [roomId]);

  const fetchUploads = async () => {
    try {
      const res = await fetch(`${API_URL}/api/storage/${roomId}/uploads`, { headers });
      const data = await res.json();
      setUploads(data.uploads || []);
    } catch (err) { console.error(err); }
  };

  const fetchSnapshots = async () => {
    try {
      const res = await fetch(`${API_URL}/api/storage/${roomId}/snapshots`, { headers });
      const data = await res.json();
      setSnapshots(data.snapshots || []);
    } catch (err) { console.error(err); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/storage/${roomId}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${file.name} uploaded!`);
        fetchUploads();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (uploadId, fileName) => {
  try {
    const res = await fetch(
      `${API_URL}/api/storage/${roomId}/download/${uploadId}`,
      { headers }
    );

    if (!res.ok) {
      setMessage("❌ Download failed");
      return;
    }

    // Get file as blob and trigger browser download
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download error:", err);
    setMessage("❌ Download failed");
  }
};

  const handleDelete = async (uploadId) => {
    if (!window.confirm("Delete this file?")) return;
    try {
      await fetch(`${API_URL}/api/storage/${roomId}/upload/${uploadId}`, {
        method: "DELETE", headers,
      });
      fetchUploads();
      setMessage("🗑️ File deleted");
    } catch (err) {
      setMessage("❌ Delete failed");
    }
  };

  const handleExport = () => {
    window.open(`${API_URL}/api/storage/${roomId}/export?token=${token}`, "_blank");
  };

  const handleSaveSnapshot = async () => {
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/storage/${roomId}/snapshot`, {
        method: "POST", headers,
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        fetchSnapshots();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ Snapshot failed");
    }
  };

  const handleRestoreSnapshot = async (key) => {
  if (!window.confirm("Restore this snapshot? Current code will be overwritten.")) return;
  try {
    const res = await fetch(`${API_URL}/api/storage/${roomId}/snapshot/restore`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("✅ Snapshot restored successfully!");
      // Socket event will handle file tree update automatically
      // No reload needed
    } else {
      setMessage(`❌ ${data.error}`);
    }
  } catch (err) {
    setMessage("❌ Restore failed");
  }
};

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div style={st.container}>
      <div style={st.header}>
        <span style={st.title}>☁️ Cloud Storage</span>
        <button onClick={handleExport} style={st.exportBtn} title="Download project as ZIP">📥 Export</button>
      </div>

      {/* Tabs */}
      <div style={st.tabs}>
        <button onClick={() => setActiveTab("uploads")} style={{ ...st.tab, borderBottom: activeTab === "uploads" ? "2px solid #38bdf8" : "2px solid transparent", color: activeTab === "uploads" ? "#38bdf8" : "#94a3b8" }}>
          📁 Files ({uploads.length})
        </button>
        <button onClick={() => setActiveTab("snapshots")} style={{ ...st.tab, borderBottom: activeTab === "snapshots" ? "2px solid #38bdf8" : "2px solid transparent", color: activeTab === "snapshots" ? "#38bdf8" : "#94a3b8" }}>
          📸 Snapshots ({snapshots.length})
        </button>
      </div>

      {/* Message */}
      {message && (
        <div style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "4px", marginBottom: "6px", background: message.includes("✅") ? "#22c55e22" : "#ef444422", color: message.includes("✅") ? "#22c55e" : "#ef4444" }}>
          {message}
        </div>
      )}

      {/* Uploads Tab */}
      {activeTab === "uploads" && (
        <div>
          {/* Upload button */}
          <input type="file" ref={fileInputRef} onChange={handleUpload} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ ...st.uploadBtn, opacity: uploading ? 0.6 : 1 }}>
            {uploading ? "⏳ Uploading..." : "📤 Upload File"}
          </button>

          {/* File list */}
          <div style={st.list}>
            {uploads.length === 0 ? (
              <p style={st.empty}>No files uploaded yet</p>
            ) : (
              uploads.map((f) => (
                <div key={f._id} style={st.fileItem}>
                  <div style={st.fileInfo}>
                    <span style={st.fileName}>{f.originalName}</span>
                    <span style={st.fileMeta}>
                      {formatSize(f.size)} • {f.uploadedBy} • {formatDate(f.createdAt)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "3px" }}>
                    <button onClick={() => handleDownload(f._id, f.originalName)} style={st.iconBtn} title="Download">📥</button>
                    <button onClick={() => handleDelete(f._id)} style={st.iconBtn} title="Delete">🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Snapshots Tab */}
      {activeTab === "snapshots" && (
        <div>
          {isLeader && (
            <button onClick={handleSaveSnapshot} style={st.uploadBtn}>📸 Save Snapshot</button>
          )}
          <div style={st.list}>
            {snapshots.length === 0 ? (
              <p style={st.empty}>No snapshots yet{isLeader ? ". Click above to save one." : "."}</p>
            ) : (
              snapshots.map((snap, i) => {
                const name = snap.key.split("/").pop();
                const vMatch = name.match(/v(\d+)/);
                const version = vMatch ? vMatch[1] : i + 1;
                return (
                  <div key={snap.key} style={st.fileItem}>
                    <div style={st.fileInfo}>
                      <span style={st.fileName}>Version {version}</span>
                      <span style={st.fileMeta}>{formatDate(snap.lastModified)}</span>
                    </div>
                    {isLeader && (
                      <button onClick={() => handleRestoreSnapshot(snap.key)} style={{ ...st.iconBtn, fontSize: "11px" }} title="Restore">♻️</button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  container: { marginTop: "10px", borderTop: "1px solid #334155", paddingTop: "8px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  title: { fontSize: "13px", fontWeight: "bold", color: "#94a3b8" },
  exportBtn: { background: "#334155", color: "white", border: "none", borderRadius: "4px", padding: "3px 8px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" },
  tabs: { display: "flex", borderBottom: "1px solid #334155", marginBottom: "8px" },
  tab: { flex: 1, background: "transparent", border: "none", padding: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" },
  uploadBtn: { width: "100%", padding: "6px", background: "#334155", color: "white", border: "1px dashed #64748b", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold", marginBottom: "6px" },
  list: { maxHeight: "120px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "3px" },
  empty: { color: "#64748b", fontSize: "11px", textAlign: "center", padding: "10px 0" },
  fileItem: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", padding: "5px 8px", borderRadius: "4px" },
  fileInfo: { display: "flex", flexDirection: "column", gap: "1px", flex: 1, minWidth: 0 },
  fileName: { fontSize: "11px", color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileMeta: { fontSize: "9px", color: "#64748b" },
  iconBtn: { background: "transparent", border: "none", cursor: "pointer", fontSize: "13px", padding: "2px" },
};

export default CloudStorage;