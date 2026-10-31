import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken } from "../middleware/auth.js";
import AiChat from "../models/AiChat.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==================== GET ALL USER SESSIONS ====================
router.get("/sessions", verifyToken, async (req, res) => {
  try {
    const sessions = await AiChat.find({ username: req.user.username })
      .select("-messages")
      .sort({ updatedAt: -1 });
    res.json({ sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// ==================== GET SPECIFIC SESSION ====================
router.get("/sessions/:id", verifyToken, async (req, res) => {
  try {
    const session = await AiChat.findOne({
      _id: req.params.id,
      username: req.user.username
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// ==================== DELETE SESSION ====================
router.delete("/sessions/:id", verifyToken, async (req, res) => {
  try {
    await AiChat.deleteOne({
      _id: req.params.id,
      username: req.user.username
    });
    res.json({ message: "Session deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// ==================== CHAT WITH AI ====================
router.post("/chat", verifyToken, async (req, res) => {
  try {
    const { prompt, codeContext, sessionId } = req.body;
    const username = req.user.username;

    // Validate input
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt cannot be empty" });
    }

    let session;

    // Check if creating new session or loading existing
    if (!sessionId) {
      const count = await AiChat.countDocuments({ username });
      if (count >= 5) {
        return res.status(403).json({
          error: "Maximum 5 chat sessions reached. Please delete an old one to create a new chat."
        });
      }
      session = new AiChat({
        username,
        title: prompt.substring(0, 40) + (prompt.length > 40 ? "..." : ""),
        messages: []
      });
    } else {
      session = await AiChat.findOne({ _id: sessionId, username });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
    }

    // Add user message
    session.messages.push({ role: "user", text: prompt });

    // Build system prompt
    let systemPrompt = `You are a helpful coding assistant embedded in CodeCollab IDE,
a real-time collaborative code editor. Be concise and helpful.
When explaining code, use markdown with proper syntax highlighting.
Keep responses under 500 words unless asked for more detail.`;

    if (codeContext && codeContext.trim()) {
      systemPrompt += `\n\nThe user is currently working on this code:\n\`\`\`\n${codeContext}\n\`\`\`\n\nAnswer questions about this code or help improve it.`;
    }

    // Build history for Gemini (exclude last message — that's the current prompt)
    const history = session.messages.slice(0, -1).map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    // ==================== CALL GEMINI WITH RETRY ====================
    let responseText = "";
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          systemInstruction: systemPrompt
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(prompt);
        responseText = result.response.text();
        break; // Success — exit retry loop

      } catch (retryErr) {
        attempts++;
        console.log(`Gemini attempt ${attempts} failed: ${retryErr.message}`);

        if (retryErr.message.includes("503") && attempts < maxAttempts) {
          // Wait 2 seconds before retrying
          console.log(`Retrying in 2 seconds... (attempt ${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // Not a 503 or max attempts reached — throw to outer catch
        throw retryErr;
      }
    }

    // Save AI response to session
    session.messages.push({ role: "model", text: responseText });
    session.updatedAt = Date.now();
    await session.save();

    // Return response to frontend
    res.json({
      reply: responseText,
      sessionId: session._id,
      title: session.title
    });

  } catch (err) {
    console.error("Gemini API Error:", err);

    if (err.message.includes("503")) {
      return res.status(503).json({
        error: "AI is currently overloaded. Please try again in a few seconds."
      });
    }

    if (err.message.includes("429")) {
      return res.status(429).json({
        error: "API rate limit exceeded. Please wait a moment and try again."
      });
    }

    if (err.message.includes("403")) {
      return res.status(403).json({
        error: "API key invalid or expired. Check your GEMINI_API_KEY in .env"
      });
    }

    if (err.message.includes("404")) {
      return res.status(404).json({
        error: "AI model not found. Contact support."
      });
    }

    res.status(500).json({
      error: "AI assistant encountered an error. Please try again."
    });
  }
});

export default router;