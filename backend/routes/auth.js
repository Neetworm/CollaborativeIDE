import express from "express";
import bcrypt from "bcryptjs";
import axios from "axios";
import User from "../models/User.js";
import { generateToken, verifyToken } from "../middleware/auth.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// ==================== EXISTING: REGISTER ====================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Generate placeholder email if not provided
    const userEmail = email?.trim() || `${username}_${Date.now()}@codecollab.local`;

    const existingUser = await User.findOne(
      email?.trim()
        ? { $or: [{ username }, { email: userEmail }] }
        : { username }
    );  
    if (existingUser) {
      return res.status(400).json({
        error: existingUser.username === username
          ? "Username already taken"
          : "Email already registered"
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email: userEmail, password: hashed });
    const token = generateToken(user);
    res.status(201).json({ 
      token, 
      user: { id: user._id, username: user.username, email: user.email } 
    });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ==================== EXISTING: LOGIN ====================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Check if user is GitHub-only (no password)
    if (!user.password) {
      return res.status(401).json({ 
        error: "This account uses GitHub login. Please use 'Login with GitHub'." 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = generateToken(user);
    res.json({ 
      token, 
      user: { id: user._id, username: user.username, email: user.email } 
    });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ==================== EXISTING: GET ME ====================
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        githubUsername: user.githubUsername,
        githubAvatar: user.githubAvatar,
        authProvider: user.authProvider
      } 
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== NEW: GITHUB OAUTH - STEP 1 ====================
// Frontend calls this to get the GitHub login URL
router.get("/github", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/github/callback`,
    scope: "user:email",  // We only need email and profile
  });

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params}`;
  res.json({ url: githubAuthUrl });
});

// ==================== NEW: GITHUB OAUTH - STEP 2 (CALLBACK) ====================
// GitHub redirects here after user approves
router.get("/github/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/?error=github_auth_failed`
    );
  }

  try {
    // Step 1: Exchange code for access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth?error=github_token_failed`
      );
    }

    // Step 2: Get GitHub user profile
    const profileResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const githubProfile = profileResponse.data;

    // Step 3: Get GitHub user email (might be private)
    let githubEmail = githubProfile.email;
    if (!githubEmail) {
      const emailResponse = await axios.get(
        "https://api.github.com/user/emails",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const primaryEmail = emailResponse.data.find(e => e.primary && e.verified);
      githubEmail = primaryEmail?.email || null;
    }

    if (!githubEmail) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth?error=no_email`
      );
    }

    // Step 4: Check if GitHub account already linked
    let user = await User.findOne({ githubId: String(githubProfile.id) });

    if (user) {
      // Already linked — just log them in
      const token = generateToken(user);
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/github/success?token=${token}&username=${user.username}&email=${user.email}&id=${user._id}`
      );
    }

    // Step 5: Check if email already exists (merge scenario)
    const existingEmailUser = await User.findOne({ email: githubEmail });

    if (existingEmailUser) {
      // Email exists — send merge prompt to frontend
      // We pass a temporary merge token (the GitHub access token)
      // Frontend will show: "Account exists, want to merge?"
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/github/merge?` +
        `githubId=${githubProfile.id}` +
        `&githubUsername=${encodeURIComponent(githubProfile.login)}` +
        `&githubAvatar=${encodeURIComponent(githubProfile.avatar_url || "")}` +
        `&email=${encodeURIComponent(githubEmail)}` +
        `&existingUsername=${encodeURIComponent(existingEmailUser.username)}`
      );
    }

    // Step 6: New user — create account with GitHub profile
    // Use GitHub username, but check if it's taken in our system
    let username = githubProfile.login;
    const usernameTaken = await User.findOne({ username });
    if (usernameTaken) {
      username = `${githubProfile.login}_gh`; // Append _gh if taken
    }

    user = await User.create({
      username,
      email: githubEmail,
      password: null,          // No password for GitHub users
      githubId: String(githubProfile.id),
      githubUsername: githubProfile.login,
      githubAvatar: githubProfile.avatar_url || null,
      authProvider: "github",
    });

    const token = generateToken(user);
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/github/success?token=${token}&username=${user.username}&email=${user.email}&id=${user._id}`
    );

  } catch (err) {
    console.error("GitHub OAuth Error:", err.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth?error=github_server_error`
    );
  }
});

// ==================== NEW: MERGE GITHUB ACCOUNT ====================
// Called when user confirms they want to merge GitHub with existing account
router.post("/github/merge", verifyToken, async (req, res) => {
  try {
    const { githubId, githubUsername, githubAvatar } = req.body;

    if (!githubId) {
      return res.status(400).json({ error: "GitHub data missing" });
    }

    // Update the existing user with GitHub info
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        githubId: String(githubId),
        githubUsername,
        githubAvatar,
        authProvider: "both",  // Now has both local + github
      },
      { new: true }
    );

    const token = generateToken(user);
    res.json({ 
      message: "GitHub account linked successfully!",
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        githubUsername: user.githubUsername,
        githubAvatar: user.githubAvatar,
        authProvider: user.authProvider
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Merge failed: " + err.message });
  }
});

// ==================== NEW: LINK GITHUB (logged in user) ====================
// For already logged-in users who want to connect their GitHub
router.get("/github/link", verifyToken, (req, res) => {
  // Store user ID in state param so we know who to link after callback
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/github/callback`,
    scope: "user:email",
    state: `link_${req.user.id}`,  // Pass user ID in state
  });

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params}`;
  res.json({ url: githubAuthUrl });
});
// ==================== FORGOT PASSWORD ====================
router.post("/forgot-password", async (req, res) => {
  try {
    const { username, email, newPassword } = req.body;

    if (!username || !email || !newPassword) {
      return res.status(400).json({ 
        error: "Username, email and new password are required" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: "Password must be at least 6 characters" 
      });
    }

    // Find user by both username AND email (double verification)
    const user = await User.findOne({ username, email });
    if (!user) {
      return res.status(404).json({ 
        error: "No account found with that username and email combination" 
      });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: user._id }, { password: hashed });

    res.json({ message: "Password reset successful. You can now login." });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});
export default router;