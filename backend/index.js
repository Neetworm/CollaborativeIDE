import authRoutes from "./routes/auth.js";
import storageRoutes from "./routes/storage.js";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import connectDB from "./db.js";
import User from "./models/User.js";
import Project from "./models/Project.js";
import {
  verifyToken,
  verifySocketToken,
} from "./middleware/auth.js";
import { executeCode } from "./executeCode.js";

const app = express();

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://collaborative-ide-six.vercel.app",
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json()); 
app.use("/api/auth", authRoutes); 
app.use("/api/storage", storageRoutes); 

// Connect MongoDB
connectDB();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://collaborative-ide-six.vercel.app",
      process.env.CLIENT_URL,
    ].filter(Boolean),
    
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 10 * 1024 * 1024, // 10 MB transport ceiling
});

// ==================== IN-MEMORY STORES ====================
const roomUsers = {};
const roomFiles = {};
const roomCursors = {};
const roomFollowMe = {};
const roomAnalytics = {};
const roomSettings = {}; 
const runningProcesses = {};
const pendingJoinRequests = {}; 
const dirtyRooms = new Set();

const CURSOR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD",
  "#98D8C8", "#F7DC6F", "#FF8A65", "#81C784", "#64B5F6", "#BA68C8",
];

// ==================== HELPERS ====================
function createDefaultFileTree(language) {
  const defaults = {
    JavaScript: { name: "main.js", content: '// Start coding here\nconsole.log("Hello World!");\n', lang: "javascript" },
    Python: { name: "main.py", content: '# Start coding here\nprint("Hello World!")\n', lang: "python" },
    "C++": { name: "main.cpp", content: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}\n', lang: "cpp" },
    Java: { name: "Main.java", content: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}\n', lang: "java" },
  };
  const d = defaults[language] || defaults.JavaScript;
  return {
    files: [{ id: "file-1", name: d.name, content: d.content, language: d.lang }],
    activeFileId: "file-1",
  };
}

function getActiveFileContent(roomId) {
  const tree = roomFiles[roomId];
  if (!tree) return "";
  const f = tree.files.find((x) => x.id === tree.activeFileId);
  return f ? f.content : "";
}

function setActiveFileContent(roomId, content) {
  const tree = roomFiles[roomId];
  if (!tree) return;
  const f = tree.files.find((x) => x.id === tree.activeFileId);
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
        updatedAt: Date.now(),
      }
    );
  } catch (err) {
    console.error(`Error saving room ${roomId}:`, err.message);
  }
}

async function loadRoomFromDB(roomId) {
  try {
    const project = await Project.findOne({ roomId });
    return project || null;
  } catch (err) {
    console.error(`Error loading room ${roomId}:`, err.message);
    return null;
  }
}

// ==================== SECURITY HELPERS ====================
function isAuthorizedRoomMember(socket, roomId) {
  return (
    typeof roomId === "string" &&
    socket.data.isAuthorized === true &&
    socket.data.roomId === roomId &&
    socket.rooms.has(roomId)
  );
}

function isRoomCreator(socket, roomId) {
  return isAuthorizedRoomMember(socket, roomId) && socket.data.role === "creator";
}

function emitSecurityError(socket, message = "You are not authorized to perform this action.") {
  socket.emit("room-error", { message });
}

function isValidText(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength;
}

function isValidFile(file) {
  return (
    file &&
    typeof file === "object" &&
    typeof file.id === "string" && file.id.length <= 100 &&
    typeof file.name === "string" && file.name.length > 0 && file.name.length <= 255 &&
    typeof file.content === "string" &&
    Buffer.byteLength(file.content, "utf8") <= 5 * 1024 * 1024 &&
    typeof file.language === "string" && file.language.length <= 50
  );
}

async function revokeRoomMember(roomId, username) {
  const sockets = await io.in(roomId).fetchSockets();
  for (const memberSocket of sockets) {
    if (memberSocket.data.username !== username) continue;
    memberSocket.data.isAuthorized = false;
    memberSocket.data.roomId = null;
    memberSocket.data.role = null;
    await memberSocket.leave(roomId);
    memberSocket.emit("join-status", {
      status: "revoked",
      message: "Your access to this room has been revoked.",
    });
  }
}

// ==================== AUTO-SAVE INTERVAL ====================
setInterval(async () => {
  for (const roomId of dirtyRooms) {
    await saveRoomToDB(roomId);
  }
  dirtyRooms.clear();
}, 10000);

// ==================== REST API: PROJECTS ====================
app.get("/api/projects", verifyToken, async (req, res) => {
  try {
    const username = req.user.username;
    const projects = await Project.find({
      $or: [
        { creator: username },
        { participants: username },
        { isPublic: true },
      ],
    }).select("-files").sort({ updatedAt: -1 });
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/projects", verifyToken, async (req, res) => {
  try {
    const { roomId, title, language, isPublic } = req.body;
    if (!roomId || !title || !language) return res.status(400).json({ error: "Required fields missing" });

    const existing = await Project.findOne({ roomId });
    if (existing) return res.status(400).json({ error: "Room ID already exists." });

    const defaultTree = createDefaultFileTree(language);
    const project = await Project.create({
      roomId, title, language,
      creator: req.user.username,
      files: defaultTree.files,
      activeFileId: defaultTree.activeFileId,
      participants: [req.user.username],
      isPublic: isPublic !== false,
    });
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/projects/:roomId", verifyToken, async (req, res) => {
  try {
    const project = await Project.findOne({ roomId: req.params.roomId }).select("-files");
    if (!project) return res.status(404).json({ error: "Room not found" });

    const username = req.user.username;
    const isCreator = project.creator === username;
    const isParticipant = project.participants?.includes(username);

    res.json({
      project: {
        roomId: project.roomId, title: project.title, language: project.language,
        creator: project.creator, isPublic: project.isPublic,
        participants: isCreator || isParticipant ? project.participants : [],
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error while looking up room" });
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

app.get("/api/analytics", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user || user.isAdmin !== true) {
      return res.status(403).json({ error: "Access Denied: Admin privileges required." });
    }
    res.json({ rooms: roomAnalytics, users: roomUsers });
  } catch (error) {
    res.status(500).json({ error: "Server error fetching analytics" });
  }
});

// ==================== SOCKET MIDDLEWARE ====================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("AUTH_REQUIRED"));

    const user = verifySocketToken(token);
    if (!user || !user.username) return next(new Error("INVALID_TOKEN"));

    socket.data.username = user.username;
    socket.data.isAuthorized = false;
    socket.data.roomId = null;
    socket.data.role = null;
    next();
  } catch (error) {
    next(new Error("INVALID_TOKEN"));
  }
});

// ==================== SOCKET EVENTS ====================
io.on("connection", (socket) => {
  const username = socket.data.username;
  console.log(`🟢 Connected: ${username} (${socket.id})`);

  socket.on("snapshot-restored", ({ roomId, files }) => {
    if (!isRoomCreator(socket, roomId)) return emitSecurityError(socket);
    if (roomFiles[roomId]) roomFiles[roomId].files = files;
    socket.to(roomId).emit("snapshot-restored", { files });
  });

  socket.on("join-room", async ({ roomId }) => {
    try {
      if (!roomId || typeof roomId !== "string") {
        return socket.emit("join-status", { status: "error", message: "Invalid Room ID." });
      }

      const cleanRoomId = roomId.trim();
      const project = await loadRoomFromDB(cleanRoomId);

      if (!project) {
        return socket.emit("join-status", { status: "not-found", message: "Room not found." });
      }

      const isCreator = project.creator === username;
      const isParticipant = project.participants?.includes(username);

      if (!project.isPublic && !isCreator && !isParticipant) {
        if (!pendingJoinRequests[cleanRoomId]) pendingJoinRequests[cleanRoomId] = [];
        const existing = pendingJoinRequests[cleanRoomId].find((r) => r.username === username);
        
        if (existing) existing.socketId = socket.id;
        else pendingJoinRequests[cleanRoomId].push({ socketId: socket.id, username });

        socket.emit("join-status", { status: "pending", message: "Waiting for leader approval..." });

        const leaderSocket = roomUsers[cleanRoomId]?.find((u) => u.username === project.creator);
        if (leaderSocket) {
          io.to(leaderSocket.id).emit("pending-requests-update", pendingJoinRequests[cleanRoomId]);
        }
        return;
      }

      if (!isParticipant && !isCreator) {
        await Project.updateOne({ roomId: cleanRoomId }, { $addToSet: { participants: username } });
      }

      await completeJoin(socket, cleanRoomId, username, project);
    } catch (error) {
      socket.emit("join-status", { status: "error", message: "Something went wrong while joining." });
    }
  });

  async function completeJoin(sock, roomId, uname, project) {
    await sock.join(roomId);
    sock.data.roomId = roomId;
    sock.data.username = uname;
    sock.data.role = project.creator === uname ? "creator" : "participant";
    sock.data.isAuthorized = true;

    roomSettings[roomId] = { creator: project.creator, isPublic: project.isPublic };

    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    const isNew = !roomUsers[roomId].some((u) => u.username === uname);
    roomUsers[roomId] = roomUsers[roomId].filter((u) => u.username !== uname);
    
    const color = CURSOR_COLORS[roomUsers[roomId].length % CURSOR_COLORS.length];
    roomUsers[roomId].push({ id: sock.id, username: uname, status: "Online", color });

    io.to(roomId).emit("room-users-update", roomUsers[roomId]);
    if (isNew) io.to(roomId).emit("receive-chat", { sender: "System", text: `${uname} joined the room.`, isSystem: true });

    if (!roomFiles[roomId]) {
      roomFiles[roomId] = project.files?.length > 0 
        ? { files: project.files, activeFileId: project.activeFileId || project.files[0].id }
        : createDefaultFileTree(project.language);
    }

    sock.emit("file-tree-sync", roomFiles[roomId]);
    sock.emit("code-update", getActiveFileContent(roomId));

    if (!roomCursors[roomId]) roomCursors[roomId] = {};
    sock.emit("all-cursors", roomCursors[roomId]);

    if (!roomFollowMe[roomId]) roomFollowMe[roomId] = { active: false, leaderId: null, leaderName: null };
    sock.emit("follow-me-state", roomFollowMe[roomId]);

    if (!roomAnalytics[roomId]) roomAnalytics[roomId] = {};
    if (!roomAnalytics[roomId][uname]) {
      roomAnalytics[roomId][uname] = { totalEdits: 0, errorStreak: 0, maxErrorStreak: 0, successfulBuilds: 0, failedBuilds: 0, lastActivity: Date.now() };
    }
    sock.emit("analytics-update", roomAnalytics[roomId]);
    sock.emit("room-settings-update", roomSettings[roomId]);
    sock.emit("join-status", { status: "joined" });

    if (roomSettings[roomId].creator === uname && pendingJoinRequests[roomId]?.length > 0) {
      sock.emit("pending-requests-update", pendingJoinRequests[roomId]);
    }
  }

  socket.on("join-request-respond", async ({ roomId, requesterUsername, approved }) => {
    if (!isRoomCreator(socket, roomId)) return emitSecurityError(socket);

    const requests = pendingJoinRequests[roomId];
    if (!requests) return;
    const requestIndex = requests.findIndex((r) => r.username === requesterUsername);
    if (requestIndex === -1) return;
    
    const request = requests[requestIndex];
    requests.splice(requestIndex, 1);
    if (requests.length === 0) delete pendingJoinRequests[roomId];

    if (approved) await Project.updateOne({ roomId }, { $addToSet: { participants: requesterUsername } });

    const requesterSocket = io.sockets.sockets.get(request.socketId);
    if (approved && requesterSocket) {
      const updatedProject = await loadRoomFromDB(roomId);
      if (updatedProject) {
        await completeJoin(requesterSocket, roomId, requesterUsername, updatedProject);
        io.to(roomId).emit("receive-chat", { sender: "System", text: `✅ ${requesterUsername} was approved by ${socket.data.username}.`, isSystem: true });
      }
    } else if (!approved && requesterSocket) {
      requesterSocket.emit("join-status", { status: "denied", message: `Access denied by ${socket.data.username}.` });
    }
    socket.emit("pending-requests-update", pendingJoinRequests[roomId] || []);
  });

  socket.on("toggle-room-access", async ({ roomId }) => {
    if (!isRoomCreator(socket, roomId)) return emitSecurityError(socket);
    roomSettings[roomId].isPublic = !roomSettings[roomId].isPublic;
    await Project.updateOne({ roomId }, { isPublic: roomSettings[roomId].isPublic });
    io.to(roomId).emit("room-settings-update", roomSettings[roomId]);
    io.to(roomId).emit("receive-chat", { sender: "System", text: `🔒 Room is now ${roomSettings[roomId].isPublic ? "PUBLIC" : "PRIVATE"}.`, isSystem: true });
    dirtyRooms.add(roomId);
  });

  socket.on("code-change", ({ roomId, code }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return;
    if (Buffer.byteLength(code || "", "utf8") > 5 * 1024 * 1024) return emitSecurityError(socket, "Payload too large");
    
    setActiveFileContent(roomId, code);
    socket.to(roomId).emit("code-update", code);
    dirtyRooms.add(roomId);
    
    if (roomAnalytics[roomId]?.[socket.data.username]) {
      roomAnalytics[roomId][socket.data.username].totalEdits++;
      roomAnalytics[roomId][socket.data.username].lastActivity = Date.now();
      io.to(roomId).emit("analytics-update", roomAnalytics[roomId]);
    }
  });

  // Notice 'sender' was removed from the payload to prevent spoofing
  socket.on("send-chat", ({ roomId, text }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return;
    if (!isValidText(text, 1000)) return emitSecurityError(socket, "Message invalid");
    io.to(roomId).emit("receive-chat", { sender: socket.data.username, text, isSystem: false });
  });

  socket.on("cursor-update", ({ roomId, position, selection }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return;
    if (!roomCursors[roomId]) roomCursors[roomId] = {};
    const user = roomUsers[roomId]?.find((u) => u.id === socket.id);
    if (!user) return;
    
    roomCursors[roomId][socket.id] = { username: user.username, color: user.color, position, selection };
    socket.to(roomId).emit("cursor-update", { socketId: socket.id, ...roomCursors[roomId][socket.id] });
  });

socket.on("file-create", ({ roomId, file }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return emitSecurityError(socket);
    if (!isValidFile(file) || !roomFiles[roomId]) return;
    
    // Tag the file with the creator's username before saving
    file.creator = socket.data.username;
    roomFiles[roomId].files.push(file);
    
    io.to(roomId).emit("file-tree-sync", roomFiles[roomId]);
    dirtyRooms.add(roomId);
  });

  socket.on("file-rename", ({ roomId, fileId, newName }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return emitSecurityError(socket);
    if (!isValidText(newName, 255) || !roomFiles[roomId]) return;
    const f = roomFiles[roomId].files.find((x) => x.id === fileId);
    if (f) {
      f.name = newName;
      io.to(roomId).emit("file-tree-sync", roomFiles[roomId]);
      dirtyRooms.add(roomId);
    }
  });

  socket.on("file-delete", ({ roomId, fileId }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return emitSecurityError(socket);
    const tree = roomFiles[roomId];
    if (!tree || tree.files.length <= 1) return;
    
    const fileToDelete = tree.files.find((f) => f.id === fileId);
    if (!fileToDelete) return;

    // Authorization: Only the Room Creator OR the File Creator can delete
    const isRoomLeader = roomSettings[roomId]?.creator === socket.data.username;
    const isFileCreator = fileToDelete.creator === socket.data.username;

    if (!isRoomLeader && !isFileCreator) {
      return emitSecurityError(socket, "Only the room leader or file creator can delete this file.");
    }

    tree.files = tree.files.filter((f) => f.id !== fileId);
    if (tree.activeFileId === fileId) {
      tree.activeFileId = tree.files[0].id;
      io.to(roomId).emit("code-update", getActiveFileContent(roomId));
    }
    io.to(roomId).emit("file-tree-sync", tree);
    dirtyRooms.add(roomId);
  });

  socket.on("file-select", ({ roomId, fileId }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return;
    const tree = roomFiles[roomId];
    if (!tree) return;
    tree.activeFileId = fileId;
    io.to(roomId).emit("file-tree-sync", tree);
    io.to(roomId).emit("code-update", getActiveFileContent(roomId));
  });

  socket.on("follow-me-toggle", ({ roomId }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return emitSecurityError(socket);
    if (!roomFollowMe[roomId]) roomFollowMe[roomId] = { active: false, leaderId: null, leaderName: null };
    
    if (roomFollowMe[roomId].active && roomFollowMe[roomId].leaderId === socket.id) {
      roomFollowMe[roomId] = { active: false, leaderId: null, leaderName: null };
    } else {
      roomFollowMe[roomId] = { active: true, leaderId: socket.id, leaderName: socket.data.username };
    }
    io.to(roomId).emit("follow-me-state", roomFollowMe[roomId]);
    io.to(roomId).emit("receive-chat", {
      sender: "System",
      text: roomFollowMe[roomId].active ? `📍 ${socket.data.username} started "Follow Me" mode.` : `📍 "Follow Me" mode disabled.`,
      isSystem: true,
    });
  });

  socket.on("leader-scroll", ({ roomId, scrollTop, scrollLeft }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return;
    if (roomFollowMe[roomId]?.leaderId === socket.id) {
      socket.to(roomId).emit("leader-scroll", { scrollTop, scrollLeft });
    }
  });

  socket.on("leader-cursor", ({ roomId, lineNumber, column }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return;
    if (roomFollowMe[roomId]?.leaderId === socket.id) {
      socket.to(roomId).emit("leader-cursor", { lineNumber, column });
    }
  });

  socket.on("leader-file-switch", ({ roomId, fileId }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return;
    if (roomFollowMe[roomId]?.leaderId === socket.id) {
      socket.to(roomId).emit("leader-file-switch", { fileId });
    }
  });

  socket.on("run-code", ({ roomId, files, language, stdin }) => {
    if (!isAuthorizedRoomMember(socket, roomId)) return emitSecurityError(socket);
    
    if (runningProcesses[socket.id]) {
      runningProcesses[socket.id].kill();
      delete runningProcesses[socket.id];
    }
    
    socket.emit("terminal-output", { type: "info", data: `⏳ Running ${language}...\n` });

    const child = executeCode(files, language, stdin, {
      onStdout: (d) => socket.emit("terminal-output", { type: "stdout", data: d.toString() }),
      onStderr: (d) => {
        socket.emit("terminal-output", { type: "stderr", data: d.toString() });
        const a = roomAnalytics[roomId]?.[socket.data.username];
        if (a) {
          a.errorStreak++;
          a.failedBuilds++;
          if (a.errorStreak > a.maxErrorStreak) a.maxErrorStreak = a.errorStreak;
          io.to(roomId).emit("analytics-update", roomAnalytics[roomId]);
          if (a.errorStreak >= 5) {
            io.to(roomId).emit("analytics-milestone", { username: socket.data.username, type: "error-streak", message: `⚠️ ${socket.data.username} hit ${a.errorStreak} consecutive errors!` });
          }
        }
      },
      onExit: (code) => {
        socket.emit("terminal-output", { type: "exit", data: `\n✔ Process exited with code ${code}\n` });
        delete runningProcesses[socket.id];
        const a = roomAnalytics[roomId]?.[socket.data.username];
        if (a) {
          if (code === 0) {
            a.successfulBuilds++;
            a.errorStreak = 0;
            io.to(roomId).emit("analytics-milestone", { username: socket.data.username, type: "successful-build", message: `✅ ${socket.data.username} had a successful build!` });
          }
          io.to(roomId).emit("analytics-update", roomAnalytics[roomId]);
        }
      },
      onError: (err) => socket.emit("terminal-output", { type: "stderr", data: `Error: ${err.message}\n` }),
    });
    if (child) runningProcesses[socket.id] = child;
  });

  // ============ DISCONNECT (MULTI-TAB SECURED) ============
  socket.on("disconnect", async () => {
    console.log(`🔴 Disconnected: ${username} (${socket.id})`);
    if (runningProcesses[socket.id]) {
      runningProcesses[socket.id].kill();
      delete runningProcesses[socket.id];
    }

    // Cleanup Pending Join Requests
    for (const rid of Object.keys(pendingJoinRequests)) {
      const prevLength = pendingJoinRequests[rid].length;
      pendingJoinRequests[rid] = pendingJoinRequests[rid].filter((r) => r.socketId !== socket.id);
      if (pendingJoinRequests[rid].length === 0) delete pendingJoinRequests[rid];
      else if (pendingJoinRequests[rid].length !== prevLength) {
        const leader = roomUsers[rid]?.find((u) => u.username === roomSettings[rid]?.creator);
        if (leader) io.to(leader.id).emit("pending-requests-update", pendingJoinRequests[rid]);
      }
    }

    const roomId = socket.data.roomId;
    if (!roomId || !roomUsers[roomId]) return;

    // Remove user's cursor / follow-me state instantly on tab close
    if (roomCursors[roomId]) {
      delete roomCursors[roomId][socket.id];
      io.to(roomId).emit("cursor-remove", { socketId: socket.id });
    }
    if (roomFollowMe[roomId]?.leaderId === socket.id) {
      roomFollowMe[roomId] = { active: false, leaderId: null, leaderName: null };
      io.to(roomId).emit("follow-me-state", roomFollowMe[roomId]);
    }

    // MULTI-TAB CHECK
    const allSocketsInRoom = await io.in(roomId).fetchSockets();
    const remainingSockets = allSocketsInRoom.filter(s => s.data.username === username && s.id !== socket.id);

    // Only broadcast leave and clean up room storage if NO tabs are left open
    if (remainingSockets.length === 0) {
      const idx = roomUsers[roomId].findIndex((u) => u.username === username);
      if (idx !== -1) {
        roomUsers[roomId].splice(idx, 1);
        io.to(roomId).emit("room-users-update", roomUsers[roomId]);
        io.to(roomId).emit("receive-chat", { sender: "System", text: `${username} went offline.`, isSystem: true });
      }

      // Close the room completely if empty
      if (roomUsers[roomId].length === 0) {
        await saveRoomToDB(roomId);
        delete roomUsers[roomId];
        delete roomFiles[roomId];
        delete roomCursors[roomId];
        delete roomFollowMe[roomId];
        delete roomAnalytics[roomId];
        delete roomSettings[roomId];
        dirtyRooms.delete(roomId);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () =>
  console.log(`🚀 Backend running on port ${PORT}`)
);