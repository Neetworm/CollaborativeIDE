import express from "express";
import multer from "multer";
import archiver from "archiver";
import { verifyToken } from "../middleware/auth.js";
import {
  uploadToStorage,
  getFileBuffer,
  deleteFromStorage,
  uploadSnapshot,
  getSnapshots,
  getSnapshotContent,
} from "../services/storageDB.js";
import Upload from "../models/Upload.js";
import Project from "../models/Project.js";

const router = express.Router();

// Multer config — memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/svg+xml",
      "application/pdf", "text/plain", "text/csv",
      "application/json", "application/zip",
      "text/javascript", "text/html", "text/css",
      "application/octet-stream",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  },
});

// ==================== UPLOAD FILE ====================
router.post("/:roomId/upload", verifyToken, upload.single("file"), async (req, res) => {
  console.log("📤 Upload route hit for room:", req.params.roomId);
  try {
    if (!req.file) {
      console.log("❌ No file in request");
      return res.status(400).json({ error: "No file provided" });
    }
    console.log("📁 File received:", req.file.originalname, req.file.size, "bytes");

    const { roomId } = req.params;
    const storageKey = `rooms/${roomId}/uploads/${Date.now()}_${req.file.originalname}`;

    await uploadToStorage(storageKey, req.file.buffer, req.file.mimetype);

    const uploadRecord = await Upload.create({
      roomId,
      uploadedBy: req.user.username,
      originalName: req.file.originalname,
      s3Key: storageKey,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });

    console.log("✅ Upload saved to DB:", uploadRecord._id);

    res.status(201).json({
      message: "File uploaded successfully",
      file: {
        id: uploadRecord._id,
        name: uploadRecord.originalName,
        size: uploadRecord.size,
        mimeType: uploadRecord.mimeType,
        uploadedBy: uploadRecord.uploadedBy,
        createdAt: uploadRecord.createdAt,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

// ==================== LIST UPLOADS ====================
router.get("/:roomId/uploads", verifyToken, async (req, res) => {
  try {
    const uploads = await Upload.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 })
      .select("-s3Key");
    res.json({ uploads });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch uploads" });
  }
});

// ==================== DOWNLOAD FILE ====================
router.get("/:roomId/download/:uploadId", verifyToken, async (req, res) => {
  try {
    const uploadRecord = await Upload.findById(req.params.uploadId);
    if (!uploadRecord) return res.status(404).json({ error: "File not found" });

    const buffer = await getFileBuffer(uploadRecord.s3Key);

    res.setHeader("Content-Type", uploadRecord.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${uploadRecord.originalName}"`
    );
    res.send(buffer);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

// ==================== DELETE UPLOAD ====================
router.delete("/:roomId/upload/:uploadId", verifyToken, async (req, res) => {
  try {
    const uploadRecord = await Upload.findById(req.params.uploadId);
    if (!uploadRecord) return res.status(404).json({ error: "File not found" });

    const project = await Project.findOne({ roomId: req.params.roomId });
    if (
      uploadRecord.uploadedBy !== req.user.username &&
      project?.creator !== req.user.username
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await deleteFromStorage(uploadRecord.s3Key);
    await Upload.deleteOne({ _id: uploadRecord._id });
    res.json({ message: "File deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ==================== EXPORT PROJECT AS ZIP ====================
router.get("/:roomId/export", async (req, res) => {
  try {
    const token = req.query.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    const jwt = await import("jsonwebtoken");
    const user = jwt.default.verify(token, process.env.JWT_SECRET);
    if (!user) return res.status(401).json({ error: "Invalid token" });

    const project = await Project.findOne({ roomId: req.params.roomId });
    if (!project) return res.status(404).json({ error: "Project not found" });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${(project.title || project.roomId).replace(/[^a-zA-Z0-9]/g, "_")}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of project.files) {
      archive.append(file.content || "", { name: file.name });
    }

    archive.append(
      `# ${project.title}\n\nRoom ID: ${project.roomId}\nLanguage: ${project.language}\nCreator: ${project.creator}\nExported: ${new Date().toISOString()}\n`,
      { name: "README.md" }
    );

    await archive.finalize();
  } catch (err) {
    console.error("Export error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Export failed" });
  }
});

// ==================== SAVE SNAPSHOT ====================
router.post("/:roomId/snapshot", verifyToken, async (req, res) => {
  try {
    const project = await Project.findOne({ roomId: req.params.roomId });
    if (!project) return res.status(404).json({ error: "Project not found" });

    if (project.creator !== req.user.username) {
      return res.status(403).json({ error: "Only the project leader can save snapshots" });
    }

    const snapshots = await getSnapshots(req.params.roomId);
    const version = snapshots.length + 1;

    const key = await uploadSnapshot(req.params.roomId, project.files, version);
    res.status(201).json({ message: `Snapshot v${version} saved`, key, version });
  } catch (err) {
    console.error("Snapshot error:", err);
    res.status(500).json({ error: "Snapshot failed" });
  }
});

// ==================== LIST SNAPSHOTS ====================
router.get("/:roomId/snapshots", verifyToken, async (req, res) => {
  try {
    const snapshots = await getSnapshots(req.params.roomId);
    res.json({ snapshots });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
});

// ==================== RESTORE SNAPSHOT ====================
router.post("/:roomId/snapshot/restore", verifyToken, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: "Snapshot key required" });

    const project = await Project.findOne({ roomId: req.params.roomId });
    if (!project) return res.status(404).json({ error: "Project not found" });

    if (project.creator !== req.user.username) {
      return res.status(403).json({ error: "Only the leader can restore snapshots" });
    }

    const snapshot = await getSnapshotContent(key);

    await Project.updateOne(
      { roomId: req.params.roomId },
      { files: snapshot.files, updatedAt: Date.now() }
    );

    res.json({ message: "Snapshot restored successfully", files: snapshot.files });
  } catch (err) {
    console.error("Restore error:", err);
    res.status(500).json({ error: "Restore failed" });
  }
});

export default router;