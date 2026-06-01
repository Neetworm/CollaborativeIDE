import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    minlength: 2 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true 
  },
  password: { 
    type: String, 
    minlength: 6,
    default: null  // NULL for OAuth users (no password)
  },
  
  // GitHub OAuth fields
  githubId: { type: String, default: null },
  githubUsername: { type: String, default: null },
  githubAvatar: { type: String, default: null },
  
  // Account type flags
  authProvider: { 
    type: String, 
    enum: ["local", "github", "both"], 
    default: "local" 
  },
  
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);