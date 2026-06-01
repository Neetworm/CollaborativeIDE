import { API_URL } from "../config.js";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function GitHubMerge() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const githubId = searchParams.get("githubId");
  const githubUsername = searchParams.get("githubUsername");
  const githubAvatar = searchParams.get("githubAvatar");
  const email = searchParams.get("email");
  const existingUsername = searchParams.get("existingUsername");

  const handleMerge = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Login with existing credentials to get token
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: existingUsername, password })
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData.error || "Login failed");
      }

      // Step 2: Merge GitHub with existing account
      const mergeRes = await fetch(`${API_URL}/api/auth/github/merge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginData.token}`
        },
        body: JSON.stringify({ githubId, githubUsername, githubAvatar })
      });

      const mergeData = await mergeRes.json();
      if (!mergeRes.ok) {
        throw new Error(mergeData.error || "Merge failed");
      }

      // Step 3: Save merged account token and go home
      localStorage.setItem("token", mergeData.token);
      localStorage.setItem("user", JSON.stringify({
        id: mergeData.user.id,
        username: mergeData.user.username,
        email: mergeData.user.email
      }));

      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    navigate("/auth");
  };

  return (
    <div style={{
      height: "100vh", background: "#0f172a",
      display: "flex", justifyContent: "center",
      alignItems: "center", fontFamily: "Arial"
    }}>
      <div style={{
        background: "#1e293b", padding: "40px",
        borderRadius: "16px", width: "400px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
      }}>
        {/* GitHub Avatar */}
        {githubAvatar && (
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <img
              src={decodeURIComponent(githubAvatar)}
              alt="GitHub Avatar"
              style={{ width: "64px", height: "64px", borderRadius: "50%", border: "3px solid #38bdf8" }}
            />
          </div>
        )}

        {/* Alert Message */}
        <div style={{
          background: "#facc1522", border: "1px solid #facc15",
          borderRadius: "8px", padding: "15px", marginBottom: "20px"
        }}>
          <p style={{ color: "#facc15", margin: 0, fontSize: "14px", fontWeight: "bold" }}>
            ⚠️ Account Already Exists
          </p>
          <p style={{ color: "#94a3b8", margin: "8px 0 0", fontSize: "13px" }}>
            The email <strong style={{ color: "white" }}>{email}</strong> is already
            registered under username <strong style={{ color: "#38bdf8" }}>@{existingUsername}</strong>.
          </p>
          <p style={{ color: "#94a3b8", margin: "8px 0 0", fontSize: "13px" }}>
            Want to link your GitHub account <strong style={{ color: "white" }}>@{githubUsername}</strong> to this existing account?
          </p>
        </div>

        {error && (
          <div style={{
            background: "#7f1d1d", color: "#fca5a5",
            padding: "10px", borderRadius: "8px",
            fontSize: "13px", marginBottom: "15px", textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {/* Confirm with password */}
        <form onSubmit={handleMerge}>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 10px" }}>
            Enter your password to confirm merge:
          </p>
          <input
            type="password"
            placeholder={`Password for @${existingUsername}`}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: "100%", padding: "10px",
              borderRadius: "8px", border: "1px solid #334155",
              background: "#0f172a", color: "white",
              fontSize: "14px", outline: "none",
              marginBottom: "15px", boxSizing: "border-box"
            }}
            required
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "12px",
              background: "#22c55e", color: "white",
              border: "none", borderRadius: "8px",
              fontSize: "15px", fontWeight: "bold",
              cursor: "pointer", marginBottom: "10px",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Linking..." : "✅ Yes, Link GitHub Account"}
          </button>

          <button
            type="button"
            onClick={handleDecline}
            style={{
              width: "100%", padding: "12px",
              background: "#334155", color: "white",
              border: "none", borderRadius: "8px",
              fontSize: "15px", cursor: "pointer"
            }}
          >
            No, Go Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default GitHubMerge;