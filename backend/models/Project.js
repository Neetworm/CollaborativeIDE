import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  id:       { type: String, required: true },
  name:     { type: String, required: true },
  content:  { type: String, default: "" },
  language: { type: String, default: "javascript" }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  roomId:       { type: String, required: true, unique: true },
  title:        { type: String, required: true, default: "Untitled Project" },
  language:     { type: String, required: true, default: "JavaScript" },
  creator:      { type: String, required: true },
  files:        [fileSchema],
  activeFileId: { type: String, default: "file-1" },
  participants: [{ type: String }],
  isPublic:     { type: Boolean, default: true },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

export default mongoose.model("Project", projectSchema);