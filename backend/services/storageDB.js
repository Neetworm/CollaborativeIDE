import mongoose from "mongoose";

// Store file content directly in MongoDB
const fileStorageSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  buffer: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const FileStorage = mongoose.model("FileStorage", fileStorageSchema);

// ==================== UPLOAD FILE ====================
export async function uploadToStorage(key, buffer, contentType) {
  await FileStorage.findOneAndUpdate(
    { key },
    { key, buffer, contentType, size: buffer.length },
    { upsert: true, new: true }
  );
  return { key };
}

// ==================== GET FILE BUFFER ====================
export async function getFileBuffer(key) {
  const file = await FileStorage.findOne({ key });
  if (!file) throw new Error("File not found");
  return file.buffer;
}

// ==================== DELETE FILE ====================
export async function deleteFromStorage(key) {
  await FileStorage.deleteOne({ key });
}

// ==================== LIST FILES IN FOLDER ====================
export async function listFilesInStorage(prefix) {
  const files = await FileStorage.find(
    { key: { $regex: `^${prefix}` } },
    { key: 1, size: 1, createdAt: 1 }
  );
  return files.map(f => ({
    key: f.key,
    size: f.size,
    lastModified: f.createdAt
  }));
}

// ==================== UPLOAD SNAPSHOT ====================
export async function uploadSnapshot(roomId, files, version) {
  const key = `snapshots/${roomId}/v${version}_${Date.now()}.json`;
  const body = JSON.stringify({
    roomId,
    version,
    timestamp: new Date().toISOString(),
    files
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