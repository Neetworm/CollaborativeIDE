import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base storage directory — goes inside backend/storage/
const STORAGE_DIR = path.join(__dirname, "..", "storage");
const UPLOADS_DIR = path.join(STORAGE_DIR, "uploads");
const SNAPSHOTS_DIR = path.join(STORAGE_DIR, "snapshots");

// Create directories if they don't exist
function ensureDirs() {
  [STORAGE_DIR, UPLOADS_DIR, SNAPSHOTS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}
ensureDirs();

// ==================== UPLOAD FILE ====================
export async function uploadToStorage(key, buffer, contentType) {
  const filePath = path.join(STORAGE_DIR, key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return { key, path: filePath };
}

// ==================== GET FILE BUFFER ====================
export async function getFileBuffer(key) {
  const filePath = path.join(STORAGE_DIR, key);
  if (!fs.existsSync(filePath)) throw new Error("File not found");
  return fs.readFileSync(filePath);
}

// ==================== DELETE FILE ====================
export async function deleteFromStorage(key) {
  const filePath = path.join(STORAGE_DIR, key);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// ==================== LIST FILES IN FOLDER ====================
export async function listFilesInStorage(prefix) {
  const dirPath = path.join(STORAGE_DIR, prefix);
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath);
  return files.map((fileName) => {
    const filePath = path.join(dirPath, fileName);
    const stats = fs.statSync(filePath);
    return {
      key: path.join(prefix, fileName).replace(/\\/g, "/"),
      size: stats.size,
      lastModified: stats.mtime,
    };
  });
}

// ==================== UPLOAD CODE SNAPSHOT ====================
export async function uploadSnapshot(roomId, files, version) {
  const key = `snapshots/${roomId}/v${version}_${Date.now()}.json`;
  const body = JSON.stringify({
    roomId,
    version,
    timestamp: new Date().toISOString(),
    files,
  });
  await uploadToStorage(key, Buffer.from(body), "application/json");
  return key;
}

// ==================== GET SNAPSHOTS LIST ====================
export async function getSnapshots(roomId) {
  return await listFilesInStorage(`snapshots/${roomId}`);
}

// ==================== GET SNAPSHOT CONTENT ====================
export async function getSnapshotContent(key) {
  const buffer = await getFileBuffer(key);
  return JSON.parse(buffer.toString("utf-8"));
}