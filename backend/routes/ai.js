import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken } from "../middleware/auth.js";
import AiChat from "../models/AiChat.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Validate API key exists
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing from .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==================== GET ALL USER SESSIONS ====================
router.get("/sessions", verifyToken, async (req, res) => {
  try {
    const sessions = await AiChat.find({ username: req.user.username })
      .select("-messages")
      .sort({ updatedAt: -1 });
    res.json({ sessions });
  } catch (err) {
    console.error("Sessions fetch error:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// ==================== GET SPECIFIC SESSION ====================
router.get("/sessions/:id", verifyToken, async (req, res) => {
  try {
    const session = await AiChat.findOne({
      _id: req.params.id,
      username: req.user.username,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ session });
  } catch (err) {
    console.error("Session fetch error:", err);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// ==================== DELETE SESSION ====================
router.delete("/sessions/:id", verifyToken, async (req, res) => {
  try {
    const deleted = await AiChat.deleteOne({
      _id: req.params.id,
      username: req.user.username,
    });
    if (deleted.deletedCount === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json({ message: "Session deleted successfully" });
  } catch (err) {
    console.error("Session delete error:", err);
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

    if (prompt.trim().length > 2000) {
      return res.status(400).json({ error: "Prompt too long. Max 2000 characters." });
    }

    let session;

    if (!sessionId) {
      // Creating new session — check limit
      const count = await AiChat.countDocuments({ username });
      if (count >= 5) {
        return res.status(403).json({
          error: "Maximum 5 chat sessions reached. Please delete an old one.",
          code: "SESSION_LIMIT"
        });
      }
      session = new AiChat({
        username,
        title: prompt.substring(0, 50) + (prompt.length > 50 ? "..." : ""),
        messages: [],
      });
    } else {
      session = await AiChat.findOne({ _id: sessionId, username });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
    }

    // Add user message to session
    session.messages.push({ role: "user", text: prompt });

    // Build system prompt
    let systemPrompt = `You are a helpful coding assistant embedded inside CodeCollab IDE — a real-time collaborative code editor.

Your behavior:
- Be concise, clear, and helpful
- When showing code, always use markdown code blocks with the language specified
- Keep responses under 600 words unless the user asks for more
- If the user shares code, analyze it carefully before responding
- Always explain WHY, not just WHAT
- If you find bugs, explain the bug and the fix clearly`;

    if (codeContext && codeContext.trim()) {
      systemPrompt += `\n\nThe user is currently working on this code in their editor:\n\`\`\`\n${codeContext.substring(0, 3000)}\n\`\`\`\n\nUse this as context when answering questions.`;
    }

    // Build conversation history for Gemini
    // Exclude the last message (current prompt) — we send that separately
    const history = session.messages.slice(0, -1).map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    // Call Gemini with retry logic
    let responseText = "";
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;

    while (attempts < maxAttempts) {
      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash", // More stable than 2.0-flash
          systemInstruction: systemPrompt,
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
          },
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(prompt.trim());
        responseText = result.response.text();

        if (!responseText || responseText.trim() === "") {
          throw new Error("Empty response from AI");
        }

        break; // Success

      } catch (retryErr) {
        attempts++;
        lastError = retryErr;
        console.log(`Gemini attempt ${attempts} failed:`, retryErr.message);

        if (attempts < maxAttempts) {
          const waitMs = attempts * 2000; // 2s, 4s
          console.log(`Retrying in ${waitMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }

    // If all attempts failed
    if (!responseText) {
      console.error("All Gemini attempts failed:", lastError?.message);
      throw lastError || new Error("AI failed to respond");
    }

    // Save AI response to session
    session.messages.push({ role: "model", text: responseText });
    session.updatedAt = Date.now();
    await session.save();

    res.json({
      reply: responseText,
      sessionId: session._id,
      title: session.title,
    });

  } catch (err) {
    console.error("AI Chat Error:", err.message);

    if (err.message?.includes("503") || err.message?.includes("overloaded")) {
      return res.status(503).json({
        error: "AI is currently overloaded. Please wait a few seconds and try again.",
      });
    }

    if (err.message?.includes("429") || err.message?.includes("quota")) {
      return res.status(429).json({
        error: "API rate limit hit. Please wait a moment and try again.",
      });
    }

    if (err.message?.includes("403") || err.message?.includes("API key")) {
      return res.status(403).json({
        error: "Invalid Gemini API key. Check GEMINI_API_KEY in your .env file.",
      });
    }

    if (err.message?.includes("404")) {
      return res.status(404).json({
        error: "AI model not found. Check your Gemini model name.",
      });
    }

    res.status(500).json({
      error: "AI assistant encountered an error. Please try again.",
    });
  }
});

export default router;