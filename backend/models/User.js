import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    minlength: 2 
  },
  // EMAIL FIELD IS DEAD AND GONE
  password: { 
    type: String, 
    minlength: 6,
    default: null
  },
  githubId: { type: String, default: null },
  githubUsername: { type: String, default: null },
  githubAvatar: { type: String, default: null },
  authProvider: { 
    type: String, 
    enum: ["local", "github", "both"], 
    default: "local" 
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  recoveryKey: {
    type: String,
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);