import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema({
  roomId:       { type: String, required: true, index: true },
  uploadedBy:   { type: String, required: true },
  originalName: { type: String, required: true },
  s3Key:        { type: String, required: true, unique: true },
  size:         { type: Number, required: true },
  mimeType:     { type: String, required: true },
  createdAt:    { type: Date, default: Date.now },
});

export default mongoose.model("Upload", uploadSchema);