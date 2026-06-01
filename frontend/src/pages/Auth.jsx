import { API_URL } from "../config.js";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthError, setOauthError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "github_auth_failed") setOauthError("GitHub login failed. Please try again.");
    if (err === "github_token_failed") setOauthError("GitHub authentication failed. Please try again.");
    if (err === "no_email") setOauthError("Could not get email from GitHub. Please make your GitHub email public.");
    if (err === "github_server_error") setOauthError("Server error during GitHub login. Please try again.");
  }, []);

  const handleGitHubLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/github`);
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      setOauthError("Could not connect to GitHub. Try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isLogin
      ? `${API_URL}/api/auth/login`
      : `${API_URL}/api/auth/register`;

    const body = isLogin
      ? { username, password }
      : { username, email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Header */}
        <h1 style={s.logo}>CodeCollab IDE</h1>
        <p style={s.sub}>Real-Time Collaborative Code Editor</p>

        {/* Login / Register Tabs */}
        <div style={s.tabs}>
          <button
            onClick={() => { setIsLogin(true); setError(""); }}
            style={{
              ...s.tab,
              borderBottom: isLogin ? "2px solid #38bdf8" : "2px solid transparent",
              color: isLogin ? "#38bdf8" : "#94a3b8"
            }}
          >
            Login
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); }}
            style={{
              ...s.tab,
              borderBottom: !isLogin ? "2px solid #38bdf8" : "2px solid transparent",
              color: !isLogin ? "#38bdf8" : "#94a3b8"
            }}
          >
            Register
          </button>
        </div>

        {/* Form Error */}
        {error && <div style={s.error}>{error}</div>}

        {/* OAuth Error */}
        {oauthError && (
          <div style={{
            background: "#7f1d1d", color: "#fca5a5",
            padding: "10px", borderRadius: "8px",
            fontSize: "13px", marginBottom: "15px", textAlign: "center"
          }}>
            {oauthError}
          </div>
        )}

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit} style={s.form}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={s.input}
            required
            minLength={2}
          />
          {!isLogin && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={s.input}
              required
            />
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={s.input}
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        {/* Switch Login/Register */}
        <p style={s.switchText}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            style={s.switchLink}
          >
            {isLogin ? "Register" : "Login"}
          </span>
        </p>

        {/* Divider */}
        <div style={{
          display: "flex", alignItems: "center",
          margin: "20px 0", gap: "10px"
        }}>
          <div style={{ flex: 1, height: "1px", background: "#334155" }} />
          <span style={{ color: "#64748b", fontSize: "13px" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "#334155" }} />
        </div>

        {/* GitHub Login Button */}
        <button
          type="button"
          onClick={handleGitHubLogin}
          style={s.githubBtn}
        >
          <svg height="20" viewBox="0 0 16 16" width="20" fill="white">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Continue with GitHub
        </button>

      </div>
    </div>
  );
}

const s = {
  page: { height: "100vh", background: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Arial" },
  card: { background: "#1e293b", padding: "40px", borderRadius: "16px", width: "380px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" },
  logo: { margin: "0 0 5px", textAlign: "center", color: "#38bdf8", fontSize: "28px" },
  sub: { margin: "0 0 25px", textAlign: "center", color: "#94a3b8", fontSize: "13px" },
  tabs: { display: "flex", gap: "0", marginBottom: "20px", borderBottom: "1px solid #334155" },
  tab: { flex: 1, background: "transparent", border: "none", padding: "10px", cursor: "pointer", fontSize: "15px", fontWeight: "bold" },
  error: { background: "#7f1d1d", color: "#fca5a5", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "15px", textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: { padding: "12px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white", fontSize: "14px", outline: "none" },
  btn: { padding: "12px", borderRadius: "8px", border: "none", background: "#38bdf8", color: "#0f172a", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "5px" },
  switchText: { marginTop: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" },
  switchLink: { color: "#38bdf8", cursor: "pointer", fontWeight: "bold" },
  githubBtn: { width: "100%", padding: "12px", background: "#24292e", color: "white", border: "1px solid #444", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
};

export default Auth;