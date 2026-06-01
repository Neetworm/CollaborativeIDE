import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
import storageRoutes from "./routes/storage.js";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

import connectDB from "./db.js";
import User from "./models/User.js";
import Project from "./models/Project.js";
import { verifyToken, verifySocketToken, generateToken } from "./middleware/auth.js";
// (unsafe execution).
import { executeCode } from "./executeCode.js";
// import { executeCode } from "./executeCodeDocker.js";

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
}));                          
app.use(express.json());                  // ← json parser SECOND
app.use("/api/auth", authRoutes);         // ← routes AFTER middlewares
app.use("/api/storage", (req, res, next) => {
  req.io = io;
  next();
}, storageRoutes);   
app.use("/api/ai", aiRoutes);

// Connect MongoDB
connectDB();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ==================== IN-MEMORY STORES ====================
const roomUsers = {};
const roomFiles = {};
const roomCursors = {};
const roomFollowMe = {};
const roomAnalytics = {};
const roomSettings = {};   // { roomId: { creator, isPublic } }
const runningProcesses = {};
const pendingJoinRequests = {}; // { roomId: [{ socketId, username }] }
const dirtyRooms = new Set();

const CURSOR_COLORS = [
  "#FF6B6B","#4ECDC4","#45B7D1","#96CEB4",
  "#FFEAA7","#DDA0DD","#98D8C8","#F7DC6F",
  "#FF8A65","#81C784","#64B5F6","#BA68C8"
];

// ==================== HELPERS ====================
function createDefaultFileTree(language) {
  const defaults = {
    JavaScript: { name:"main.js", content:'// Start coding here\nconsole.log("Hello World!");\n', lang:"javascript" },
    Python:     { name:"main.py", content:'# Start coding here\nprint("Hello World!")\n', lang:"python" },
    "C++":      { name:"main.cpp", content:'#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}\n', lang:"cpp" },
    Java:       { name:"Main.java", content:'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}\n', lang:"java" },
  };
  const d = defaults[language] || defaults.JavaScript;
  return {
    files: [{ id:"file-1", name:d.name, content:d.content, language:d.lang }],
    activeFileId: "file-1"
  };
}

function getActiveFileContent(roomId) {
  const tree = roomFiles[roomId];
  if (!tree) return "";
  const f = tree.files.find(x => x.id === tree.activeFileId);
  return f ? f.content : "";
}

function setActiveFileContent(roomId, content) {
  const tree = roomFiles[roomId];
  if (!tree) return;
  const f = tree.files.find(x => x.id === tree.activeFileId);
  if (f) f.content = content;
}

async function saveRoomToDB(roomId) {
  if (!roomFiles[roomId]) return;
  try {
    await Project.findOneAndUpdate(
      { roomId },
      {
        files: roomFiles[roomId].files,
        activeFileId: roomFiles[roomId].activeFileId,
        isPublic: roomSettings[roomId]?.isPublic ?? true,
        updatedAt: Date.now()
      }
    );
  } catch (err) {
    console.error(`Error saving room ${roomId}:`, err.message);
  }
}

async function loadRoomFromDB(roomId) {
  try {
    const project = await Project.findOne({ roomId });
    if (!project) return null;
    return project;
  } catch (err) {
    console.error(`Error loading room ${roomId}:`, err.message);
    return null;
  }
}

// ==================== AUTO-SAVE INTERVAL ====================
setInterval(async () => {
  for (const roomId of dirtyRooms) {
    await saveRoomToDB(roomId);
  }
  dirtyRooms.clear();
}, 10000);

// ==================== REST API: AUTH ====================
// app.post("/api/auth/register", async (req, res) => {
//   try {
//     const { username, email, password } = req.body;
//     if (!username || !email || !password) return res.status(400).json({ error: "All fields are required" });
//     if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

//     const existingUser = await User.findOne({ $or: [{ username }, { email }] });
//     if (existingUser) {
//       return res.status(400).json({
//         error: existingUser.username === username ? "Username already taken" : "Email already registered"
//       });
//     }

//     const hashed = await bcrypt.hash(password, 10);
//     const user = await User.create({ username, email, password: hashed });
//     const token = generateToken(user);
//     res.status(201).json({ token, user: { id:user._id, username:user.username, email:user.email } });
//   } catch (err) {
//     res.status(500).json({ error: "Server error: " + err.message });
//   }
// });

// app.post("/api/auth/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     if (!username || !password) return res.status(400).json({ error: "All fields are required" });

//     const user = await User.findOne({ username });
//     if (!user) return res.status(401).json({ error: "Invalid username or password" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ error: "Invalid username or password" });

//     const token = generateToken(user);
//     res.json({ token, user: { id:user._id, username:user.username, email:user.email } });
//   } catch (err) {
//     res.status(500).json({ error: "Server error: " + err.message });
//   }
// });

// app.get("/api/auth/me", verifyToken, async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select("-password");
//     if (!user) return res.status(404).json({ error: "User not found" });
//     res.json({ user: { id:user._id, username:user.username, email:user.email } });
//   } catch (err) {
//     res.status(500).json({ error: "Server error" });
//   }
// });

// ==================== REST API: PROJECTS ====================
app.get("/api/projects", verifyToken, async (req, res) => {
  try {
    const username = req.user.username;

    const projects = await Project.find({
      $or: [
        { creator: username },           // Your own projects
        { participants: username },       // Projects you joined
        { isPublic: true },              // ALL public projects
      ]
    })
    .select("-files")
    .sort({ updatedAt: -1 });

    res.json({ projects });
  } catch (err) {
    console.error("Projects fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/projects", verifyToken, async (req, res) => {
  try {
    const { roomId, title, language, isPublic } = req.body;
    if (!roomId || !title || !language) return res.status(400).json({ error: "roomId, title, and language required" });

    const existing = await Project.findOne({ roomId });
    if (existing) return res.status(400).json({ error: "Room ID already exists. Choose another." });

    const defaultTree = createDefaultFileTree(language);
    const project = await Project.create({
      roomId,
      title,
      language,
      creator: req.user.username,
      files: defaultTree.files,
      activeFileId: defaultTree.activeFileId,
      participants: [req.user.username],
      isPublic: isPublic !== false,
    });
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

app.get("/api/projects/:roomId", verifyToken, async (req, res) => {
  try {
    const project = await Project.findOne({ roomId: req.params.roomId });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/projects/:roomId", verifyToken, async (req, res) => {
  try {
    const project = await Project.findOne({ roomId: req.params.roomId });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (project.creator !== req.user.username) return res.status(403).json({ error: "Only the creator can delete" });
    await Project.deleteOne({ roomId: req.params.roomId });
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== REST API: ANALYTICS ====================
app.get("/api/analytics", (req, res) => {
  res.json({ rooms: roomAnalytics, users: roomUsers });
});

// ==================== SOCKET MIDDLEWARE ====================
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("AUTH_REQUIRED"));
  const user = verifySocketToken(token);
  if (!user) return next(new Error("INVALID_TOKEN"));
  socket.data.user = user;
  next();
});

// ==================== SOCKET EVENTS ====================
io.on("connection", (socket) => {
  const authUser = socket.data.user;
  console.log(`🟢 Connected: ${authUser.username} (${socket.id})`);

  // ============ JOIN ROOM ============
  socket.on("join-room", async ({ roomId, language }) => {
    if (!roomId) return;
    const username = authUser.username;

    // Load project from DB if not in memory
    let project = await loadRoomFromDB(roomId);
    const isCreator = project?.creator === username;
    const isParticipant = project?.participants?.includes(username);

    // --- ACCESS CONTROL ---
    if (project && !project.isPublic && !isCreator && !isParticipant) {
      // Need approval from leader
      if (!pendingJoinRequests[roomId]) pendingJoinRequests[roomId] = [];

      // Avoid duplicate requests
      if (!pendingJoinRequests[roomId].some(r => r.username === username)) {
        pendingJoinRequests[roomId].push({ socketId: socket.id, username });
      }

      socket.emit("join-status", { status: "pending", message: "Waiting for leader approval..." });

      // Notify leader
      const leaderSocket = roomUsers[roomId]?.find(u => u.username === project.creator);
      if (leaderSocket) {
        io.to(leaderSocket.id).emit("pending-requests-update", pendingJoinRequests[roomId]);
      } else {
        socket.emit("join-status", { status: "pending", message: "Leader is offline. Waiting..." });
      }
      return;
    }

    // --- CREATE PROJECT IF NOT EXISTS ---
    if (!project) {
      const defaultTree = createDefaultFileTree(language || "JavaScript");
      project = await Project.create({
        roomId,
        title: `Project ${roomId}`,
        language: language || "JavaScript",
        creator: username,
        files: defaultTree.files,
        activeFileId: defaultTree.activeFileId,
        participants: [username],
        isPublic: true,
      });
    }

    // Add participant to DB if not there
    if (!project.participants.includes(username)) {
      await Project.updateOne({ roomId }, { $addToSet: { participants: username } });
    }

    // --- COMPLETE JOIN ---
    await completeJoin(socket, roomId, username, project);
  });

  // ============ COMPLETE JOIN (helper) ============
  async function completeJoin(sock, roomId, username, project) {
    sock.join(roomId);
    sock.data.roomId = roomId;
    sock.data.username = username;

    // Room settings
    if (!roomSettings[roomId]) {
      roomSettings[roomId] = { creator: project.creator, isPublic: project.isPublic };
    }

    // Users
    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    const isNew = !roomUsers[roomId].some(u => u.username === username);
    roomUsers[roomId] = roomUsers[roomId].filter(u => u.username !== username);
    const color = CURSOR_COLORS[roomUsers[roomId].length % CURSOR_COLORS.length];
    roomUsers[roomId].push({ id:sock.id, username, status:"Online", color });
    io.to(roomId).emit("room-users-update", roomUsers[roomId]);
    if (isNew) {
      io.to(roomId).emit("receive-chat", { sender:"System", text:`${username} joined the room.`, isSystem:true });
    }

    // File tree: load from DB if not in memory
    if (!roomFiles[roomId]) {
      if (project.files && project.files.length > 0) {
        roomFiles[roomId] = { files: project.files, activeFileId: project.activeFileId || project.files[0].id };
      } else {
        roomFiles[roomId] = createDefaultFileTree(project.language);
      }
    }
    sock.emit("file-tree-sync", roomFiles[roomId]);
    sock.emit("code-update", getActiveFileContent(roomId));

    // Cursors
    if (!roomCursors[roomId]) roomCursors[roomId] = {};
    sock.emit("all-cursors", roomCursors[roomId]);

    // Follow-me
    if (!roomFollowMe[roomId]) roomFollowMe[roomId] = { active:false, leaderId:null, leaderName:null };
    sock.emit("follow-me-state", roomFollowMe[roomId]);

    // Analytics
    if (!roomAnalytics[roomId]) roomAnalytics[roomId] = {};
    if (!roomAnalytics[roomId][username]) {
      roomAnalytics[roomId][username] = {
        totalEdits:0, errorStreak:0, maxErrorStreak:0,
        successfulBuilds:0, failedBuilds:0, lastActivity:Date.now()
      };
    }
    sock.emit("analytics-update", roomAnalytics[roomId]);

    // Room settings + join status
    sock.emit("join-status", { status: "joined" });
    sock.emit("room-settings-update", roomSettings[roomId]);

    // Send pending requests to leader
    if (roomSettings[roomId]?.creator === username && pendingJoinRequests[roomId]?.length > 0) {
      sock.emit("pending-requests-update", pendingJoinRequests[roomId]);
    }
  }

  // ============ JOIN REQUEST RESPOND (leader) ============
  socket.on("join-request-respond", async ({ roomId, requesterUsername, approved }) => {
    const settings = roomSettings[roomId];
    if (!settings || settings.creator !== authUser.username) return; // only leader

    if (!pendingJoinRequests[roomId]) return;
    const reqIdx = pendingJoinRequests[roomId].findIndex(r => r.username === requesterUsername);
    if (reqIdx === -1) return;

    const request = pendingJoinRequests[roomId][reqIdx];
    pendingJoinRequests[roomId].splice(reqIdx, 1);

    const requesterSocket = io.sockets.sockets.get(request.socketId);

    if (approved && requesterSocket) {
      // Add to DB participants
      await Project.updateOne({ roomId }, { $addToSet: { participants: requesterUsername } });
      const project = await loadRoomFromDB(roomId);
      await completeJoin(requesterSocket, roomId, requesterUsername, project);
      io.to(roomId).emit("receive-chat", {
        sender: "System",
        text: `✅ ${requesterUsername} was approved by ${authUser.username}.`,
        isSystem: true
      });
    } else if (requesterSocket) {
      requesterSocket.emit("join-status", { status: "denied", message: `Access denied by ${authUser.username}.` });
    }

    // Update leader's pending list
    socket.emit("pending-requests-update", pendingJoinRequests[roomId] || []);
  });

  // ============ TOGGLE ROOM ACCESS (leader) ============
  socket.on("toggle-room-access", async ({ roomId }) => {
    if (!roomSettings[roomId] || roomSettings[roomId].creator !== authUser.username) return;
    roomSettings[roomId].isPublic = !roomSettings[roomId].isPublic;
    await Project.updateOne({ roomId }, { isPublic: roomSettings[roomId].isPublic });
    io.to(roomId).emit("room-settings-update", roomSettings[roomId]);
    io.to(roomId).emit("receive-chat", {
      sender: "System",
      text: `🔒 Room is now ${roomSettings[roomId].isPublic ? "PUBLIC" : "PRIVATE"}.`,
      isSystem: true
    });
    dirtyRooms.add(roomId);
  });

  // ============ CODE CHANGE ============
  socket.on("code-change", ({ roomId, code }) => {
    setActiveFileContent(roomId, code);
    socket.to(roomId).emit("code-update", code);
    dirtyRooms.add(roomId);
    const u = authUser.username;
    if (roomAnalytics[roomId]?.[u]) {
      roomAnalytics[roomId][u].totalEdits++;
      roomAnalytics[roomId][u].lastActivity = Date.now();
      io.to(roomId).emit("analytics-update", roomAnalytics[roomId]);
    }
  });

  // ============ CHAT ============
  socket.on("send-chat", ({ roomId, sender, text }) => {
    io.to(roomId).emit("receive-chat", { sender, text, isSystem:false });
  });

  // ============ CURSOR ============
  socket.on("cursor-update", ({ roomId, position, selection }) => {
    if (!roomCursors[roomId]) roomCursors[roomId] = {};
    const user = roomUsers[roomId]?.find(u => u.id === socket.id);
    if (!user) return;
    roomCursors[roomId][socket.id] = { username:user.username, color:user.color, position, selection };
    socket.to(roomId).emit("cursor-update", { socketId:socket.id, ...roomCursors[roomId][socket.id] });
  });

  // ============ FILE TREE ============
  socket.on("file-create", ({ roomId, file }) => {
    if (!roomFiles[roomId]) return;
    roomFiles[roomId].files.push(file);
    io.to(roomId).emit("file-tree-sync", roomFiles[roomId]);
    dirtyRooms.add(roomId);
  });

  socket.on("file-rename", ({ roomId, fileId, newName }) => {
    if (!roomFiles[roomId]) return;
    const f = roomFiles[roomId].files.find(x => x.id === fileId);
    if (f) { f.name = newName; io.to(roomId).emit("file-tree-sync", roomFiles[roomId]); dirtyRooms.add(roomId); }
  });

  socket.on("file-delete", ({ roomId, fileId }) => {
    const tree = roomFiles[roomId];
    if (!tree || tree.files.length <= 1) return;
    tree.files = tree.files.filter(f => f.id !== fileId);
    if (tree.activeFileId === fileId) {
      tree.activeFileId = tree.files[0].id;
      io.to(roomId).emit("code-update", getActiveFileContent(roomId));
    }
    io.to(roomId).emit("file-tree-sync", tree);
    dirtyRooms.add(roomId);
  });

  socket.on("file-select", ({ roomId, fileId }) => {
    const tree = roomFiles[roomId];
    if (!tree) return;
    tree.activeFileId = fileId;
    io.to(roomId).emit("file-tree-sync", tree);
    io.to(roomId).emit("code-update", getActiveFileContent(roomId));
  });

  // ============ FOLLOW ME ============
    // ============ FOLLOW ME ============
  socket.on("follow-me-toggle", ({ roomId }) => {
    if (!roomFollowMe[roomId]) roomFollowMe[roomId] = { active:false, leaderId:null, leaderName:null };
    if (roomFollowMe[roomId].active && roomFollowMe[roomId].leaderId === socket.id) {
      roomFollowMe[roomId] = { active:false, leaderId:null, leaderName:null };
    } else {
      roomFollowMe[roomId] = { active:true, leaderId:socket.id, leaderName:authUser.username };
    }
    io.to(roomId).emit("follow-me-state", roomFollowMe[roomId]);
    io.to(roomId).emit("receive-chat", {
      sender:"System",
      text: roomFollowMe[roomId].active
        ? `📍 ${authUser.username} started "Follow Me" mode. All users will sync to their view.`
        : `📍 "Follow Me" mode disabled.`,
      isSystem:true
    });
  });

  socket.on("leader-scroll", ({ roomId, scrollTop, scrollLeft }) => {
    if (roomFollowMe[roomId]?.active && roomFollowMe[roomId]?.leaderId === socket.id) {
      socket.to(roomId).emit("leader-scroll", { scrollTop, scrollLeft });
    }
  });

  socket.on("leader-cursor", ({ roomId, lineNumber, column }) => {
    if (roomFollowMe[roomId]?.active && roomFollowMe[roomId]?.leaderId === socket.id) {
      socket.to(roomId).emit("leader-cursor", { lineNumber, column });
    }
  });

  socket.on("leader-file-switch", ({ roomId, fileId }) => {
    if (roomFollowMe[roomId]?.active && roomFollowMe[roomId]?.leaderId === socket.id) {
      socket.to(roomId).emit("leader-file-switch", { fileId });
    }
  });

  socket.on("leader-scroll", ({ roomId, scrollTop, scrollLeft }) => {
    if (roomFollowMe[roomId]?.leaderId === socket.id) {
      socket.to(roomId).emit("leader-scroll", { scrollTop, scrollLeft });
    }
  });

  // ============ CODE EXECUTION ============
  socket.on("run-code", ({ roomId, code, language }) => {
    if (runningProcesses[socket.id]) { runningProcesses[socket.id].kill(); delete runningProcesses[socket.id]; }
    socket.emit("terminal-output", { type:"info", data:`⏳ Running ${language}...\n` });
    const child = executeCode(code, language, {
      onStdout: (d) => socket.emit("terminal-output", { type:"stdout", data:d.toString() }),
      onStderr: (d) => {
        socket.emit("terminal-output", { type:"stderr", data:d.toString() });
        const u = authUser.username;
        if (roomAnalytics[roomId]?.[u]) {
          const a = roomAnalytics[roomId][u];
          a.errorStreak++; a.failedBuilds++;
          if (a.errorStreak > a.maxErrorStreak) a.maxErrorStreak = a.errorStreak;
          io.to(roomId).emit("analytics-update", roomAnalytics[roomId]);
          if (a.errorStreak >= 5) {
            io.to(roomId).emit("analytics-milestone", { username:u, type:"error-streak", message:`⚠️ ${u} hit ${a.errorStreak} consecutive errors!` });
          }
        }
      },
      onExit: (code) => {
        socket.emit("terminal-output", { type:"exit", data:`\n✔ Process exited with code ${code}\n` });
        delete runningProcesses[socket.id];
        const u = authUser.username;
        if (roomAnalytics[roomId]?.[u]) {
          if (code === 0) {
            roomAnalytics[roomId][u].successfulBuilds++;
            roomAnalytics[roomId][u].errorStreak = 0;
            io.to(roomId).emit("analytics-milestone", { username:u, type:"successful-build", message:`✅ ${u} had a successful build!` });
          }
          io.to(roomId).emit("analytics-update", roomAnalytics[roomId]);
        }
      },
      onError: (err) => socket.emit("terminal-output", { type:"stderr", data:`Error: ${err.message}\n` })
    });
    if (child) runningProcesses[socket.id] = child;
  });

  socket.on("stop-code", () => {
    if (runningProcesses[socket.id]) { runningProcesses[socket.id].kill(); delete runningProcesses[socket.id]; socket.emit("terminal-output", { type:"exit", data:"\n🛑 Process killed.\n" }); }
  });

  // ============ ANALYTICS ============
  socket.on("get-analytics", ({ roomId }) => {
    socket.emit("analytics-update", roomAnalytics[roomId] || {});
  });

  // ============ DISCONNECT ============
  socket.on("disconnect", async () => {
    console.log(`🔴 Disconnected: ${authUser.username} (${socket.id})`);
    if (runningProcesses[socket.id]) { runningProcesses[socket.id].kill(); delete runningProcesses[socket.id]; }

    // Remove from pending requests
    for (const rid in pendingJoinRequests) {
      pendingJoinRequests[rid] = pendingJoinRequests[rid].filter(r => r.socketId !== socket.id);
    }

    for (const roomId in roomUsers) {
      const idx = roomUsers[roomId].findIndex(u => u.id === socket.id);
      if (idx === -1) continue;
      const username = roomUsers[roomId][idx].username;
      roomUsers[roomId].splice(idx, 1);

      if (roomCursors[roomId]) { delete roomCursors[roomId][socket.id]; io.to(roomId).emit("cursor-remove", { socketId:socket.id }); }
      if (roomFollowMe[roomId]?.leaderId === socket.id) {
        roomFollowMe[roomId] = { active:false, leaderId:null, leaderName:null };
        io.to(roomId).emit("follow-me-state", roomFollowMe[roomId]);
      }

      io.to(roomId).emit("room-users-update", roomUsers[roomId]);
      io.to(roomId).emit("receive-chat", { sender:"System", text:`${username} went offline.`, isSystem:true });

      if (roomUsers[roomId].length === 0) {
        await saveRoomToDB(roomId);
        delete roomUsers[roomId]; delete roomFiles[roomId]; delete roomCursors[roomId];
        delete roomFollowMe[roomId]; delete roomAnalytics[roomId]; delete roomSettings[roomId];
        dirtyRooms.delete(roomId);
      }
      break;
    }
  });
});

const PORT = 5000;
httpServer.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));