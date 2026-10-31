import { useState } from "react";
import { v4 as uuid } from "uuid";

const EXT_MAP = { JavaScript:".js", Python:".py", "C++":".cpp", Java:".java" };
const LANG_MAP = { ".js":"javascript", ".py":"python", ".cpp":"cpp", ".java":"java" };

function FileTree({ fileTree, onSelect, onCreate, onRename, onDelete, language }) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");

  const handleCreate = () => {
    const ext = EXT_MAP[language] || ".js";
    const name = `file_${fileTree.files.length + 1}${ext}`;
    onCreate({
      id: `file-${uuid().slice(0,8)}`,
      name,
      content: `// ${name}\n`,
      language: LANG_MAP[ext] || "javascript"
    });
  };

  const startRename = (f) => {
    setRenamingId(f.id);
    setRenameVal(f.name);
  };

  const submitRename = (fileId) => {
    if (renameVal.trim()) onRename(fileId, renameVal.trim());
    setRenamingId(null);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
        <span style={{fontSize:"13px",fontWeight:"bold",color:"#94a3b8"}}>📁 Files</span>
        <button onClick={handleCreate} style={styles.addBtn} title="New File">+</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"2px"}}>
        {fileTree.files.map(f => (
          <div
            key={f.id}
            style={{
              ...styles.fileItem,
              background: f.id === fileTree.activeFileId ? "#334155" : "transparent",
              borderLeft: f.id === fileTree.activeFileId ? "3px solid #38bdf8" : "3px solid transparent",
            }}
          >
            {renamingId === f.id ? (
              <input
                autoFocus
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={() => submitRename(f.id)}
                onKeyDown={e => { if(e.key==="Enter") submitRename(f.id); if(e.key==="Escape") setRenamingId(null); }}
                style={styles.renameInput}
              />
            ) : (
              <span onClick={() => onSelect(f.id)} style={{flex:1,cursor:"pointer",fontSize:"13px"}}>
                📄 {f.name}
              </span>
            )}
            <div style={{display:"flex",gap:"2px"}}>
              <button onClick={() => startRename(f)} style={styles.iconBtn} title="Rename">✏️</button>
              {fileTree.files.length > 1 && (
                <button onClick={() => onDelete(f.id)} style={styles.iconBtn} title="Delete">🗑️</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  fileItem: {
    display:"flex",alignItems:"center",justifyContent:"space-between",
    padding:"5px 8px",borderRadius:"4px",color:"white",transition:"background 0.15s"
  },
  addBtn: {
    background:"#334155",color:"white",border:"none",borderRadius:"4px",
    width:"24px",height:"24px",cursor:"pointer",fontSize:"16px",lineHeight:"1"
  },
  iconBtn: {
    background:"transparent",border:"none",cursor:"pointer",fontSize:"12px",padding:"2px"
  },
  renameInput: {
    flex:1,background:"#0f172a",border:"1px solid #38bdf8",borderRadius:"3px",
    color:"white",padding:"2px 4px",fontSize:"12px",outline:"none"
  },
};

export default FileTree;