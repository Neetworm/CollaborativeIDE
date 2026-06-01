import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "model"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const aiChatSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  title: { type: String, required: true }, // E.g., "Help with React loop"
  messages: [messageSchema],
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("AiChat", aiChatSchema);