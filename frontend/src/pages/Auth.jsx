import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../config";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [recoveryKeyDisplay, setRecoveryKeyDisplay] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [resetKey, setResetKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) toast.error("Authentication error. Please try again.");
  }, [searchParams]);

  const handleGitHubLogin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/github`);
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      toast.error("Could not connect to GitHub.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const url = isLogin ? `${API_BASE_URL}/api/auth/login` : `${API_BASE_URL}/api/auth/register`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (!isLogin && data.recoveryKey) {
        toast.success("Account created successfully!");
        setRecoveryKeyDisplay(data.recoveryKey);
      } else {
        toast.success(`Welcome back, ${data.user.username}!`);
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, recoveryKey: resetKey, newPassword }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");

      toast.success("Password reset successfully! You can now log in.");
      setIsResetting(false);
      setIsLogin(true);
      setPassword("");
      setResetKey("");
      setNewPassword("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(recoveryKeyDisplay);
    toast.success("Recovery Key copied to clipboard!");
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes floatSlow { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(5deg); } 100% { transform: translateY(0px) rotate(0deg); } }
        @keyframes floatFast { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-15px) rotate(-5deg); } 100% { transform: translateY(0px) rotate(0deg); } }
        @keyframes slideUpFade { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gridPan { from { background-position: 0 0; } to { background-position: 40px 40px; } }
        
        .auth-card-anim { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .bg-grid { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-size: 40px 40px; background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px); animation: gridPan 3s linear infinite; z-index: 0; pointer-events: none; }
        .back-btn:hover { color: #f8fafc !important; transform: translateX(-3px); }
      `}</style>

      {/* Website Navigation Button */}
      <button onClick={() => navigate("/")} style={s.backBtn} className="back-btn">
         ← Back to Website
      </button>

      <div className="bg-grid"></div>
      <div style={s.glowOrb1}></div>
      <div style={s.glowOrb2}></div>

      <div style={{ ...s.floatingSymbol, top: "15%", left: "15%", animation: "floatSlow 6s infinite", color: "#38bdf8" }}>{`{ }`}</div>
      <div style={{ ...s.floatingSymbol, top: "25%", right: "20%", animation: "floatFast 5s infinite", color: "#a78bfa" }}>{`< />`}</div>
      <div style={{ ...s.floatingSymbol, bottom: "20%", left: "25%", animation: "floatFast 7s infinite", color: "#22c55e" }}>{`=>`}</div>
      <div style={{ ...s.floatingSymbol, bottom: "25%", right: "15%", animation: "floatSlow 8s infinite", color: "#facc15" }}>{`();`}</div>

      <div style={s.card} className="auth-card-anim">
        <h1 style={s.logo}>CodeCollab</h1>
        <p style={s.sub}>Real-Time Collaborative Code Editor</p>

        {recoveryKeyDisplay ? (
          <div style={{ textAlign: "center", animation: "slideUpFade 0.4s" }}>
            <div style={s.successBadge}>✓ Registration Complete</div>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px", lineHeight: "1.5" }}>
              We do not use email. If you forget your password, this key is the <strong>ONLY</strong> way to recover your account.
            </p>
            <div style={s.keyDisplayContainer}>
              <span style={s.keyText}>{recoveryKeyDisplay}</span>
            </div>
            <button onClick={copyToClipboard} style={{ ...s.btn, background: "#334155", color: "white", marginBottom: "12px" }}>
              📋 Copy Key
            </button>
            <button onClick={() => navigate("/dashboard")} style={s.btn}>
              Take me to Dashboard 🚀
            </button>
          </div>
        ) : isResetting ? (
          <form onSubmit={handleResetPassword} style={s.form}>
            <h3 style={{ color: "white", textAlign: "center", margin: "0 0 10px", fontSize: "20px" }}>Reset Password</h3>
            <p style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", marginBottom: "20px" }}>
              Enter your exact Username and Recovery Key.
            </p>

            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={s.input} required />
            <input type="text" placeholder="Recovery Key (CC-...)" value={resetKey} onChange={e => setResetKey(e.target.value)} style={s.input} required />
            
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={s.input} required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.eyeBtn}>{showPassword ? "🙈" : "👁️"}</button>
            </div>

            <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.7 : 1, marginTop: "10px" }}>
              {loading ? "Verifying..." : "Reset Password"}
            </button>
            <p style={s.switchText}>Remembered it? <span onClick={() => { setIsResetting(false); }} style={s.switchLink}>Back to Login</span></p>
          </form>
        ) : (
          <div style={{ animation: "slideUpFade 0.4s" }}>
            <div style={s.tabs}>
              <button onClick={() => setIsLogin(true)} style={{ ...s.tab, borderBottom: isLogin ? "2px solid #38bdf8" : "2px solid transparent", color: isLogin ? "#f8fafc" : "#64748b" }}>Login</button>
              <button onClick={() => setIsLogin(false)} style={{ ...s.tab, borderBottom: !isLogin ? "2px solid #38bdf8" : "2px solid transparent", color: !isLogin ? "#f8fafc" : "#64748b" }}>Register</button>
            </div>
            
            <form onSubmit={handleSubmit} style={s.form}>
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={s.input} required minLength={2} />
              
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={s.input} required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.eyeBtn}>{showPassword ? "🙈" : "👁️"}</button>
              </div>

              {isLogin && (
                <div style={{ textAlign: "right", marginTop: "-5px" }}>
                  <span onClick={() => setIsResetting(true)} style={{ color: "#64748b", fontSize: "12px", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => e.target.style.color="#38bdf8"} onMouseOut={e => e.target.style.color="#64748b"}>Forgot Password?</span>
                </div>
              )}
              
              <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.7 : 1, marginTop: "10px" }}>
                {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", margin: "25px 0", gap: "15px" }}>
              <div style={{ flex: 1, height: "1px", background: "#334155" }} />
              <span style={{ color: "#475569", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>OR</span>
              <div style={{ flex: 1, height: "1px", background: "#334155" }} />
            </div>

            <button type="button" onClick={handleGitHubLogin} style={s.githubBtn}>
              <svg height="18" viewBox="0 0 16 16" width="18" fill="white">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Continue with GitHub
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { position: "relative", height: "100vh", background: "#020617", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" },
  backBtn: { position: "absolute", top: "30px", left: "40px", background: "transparent", border: "none", color: "#94a3b8", fontSize: "14px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s", zIndex: 10, display: "flex", alignItems: "center" },
  glowOrb1: { position: "absolute", top: "-10%", left: "-10%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(0,0,0,0) 70%)", filter: "blur(40px)", zIndex: 0 },
  glowOrb2: { position: "absolute", bottom: "-10%", right: "-10%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 70%)", filter: "blur(40px)", zIndex: 0 },
  floatingSymbol: { position: "absolute", fontSize: "40px", fontWeight: "bold", opacity: 0.15, zIndex: 0, userSelect: "none", pointerEvents: "none", fontFamily: "monospace" },
  card: { position: "relative", background: "rgba(30, 41, 59, 0.7)", backdropFilter: "blur(16px)", padding: "45px 40px", borderRadius: "20px", width: "400px", border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", zIndex: 1, boxSizing: "border-box" },
  logo: { margin: "0 0 5px", textAlign: "center", color: "#f8fafc", fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px" },
  sub: { margin: "0 0 30px", textAlign: "center", color: "#38bdf8", fontSize: "14px", fontWeight: "500" },
  successBadge: { display: "inline-block", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "6px 12px", borderRadius: "20px", fontSize: "14px", fontWeight: "bold", marginBottom: "15px" },
  keyDisplayContainer: { background: "#0f172a", padding: "18px", borderRadius: "12px", border: "1px dashed #334155", marginBottom: "25px", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)" },
  keyText: { fontSize: "22px", color: "#38bdf8", letterSpacing: "3px", fontWeight: "bold", textShadow: "0 0 10px rgba(56,189,248,0.3)" },
  tabs: { display: "flex", marginBottom: "25px", gap: "10px" },
  tab: { flex: 1, background: "transparent", border: "none", padding: "10px 0", cursor: "pointer", fontSize: "15px", fontWeight: "600", transition: "color 0.2s" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  input: { width: "100%", padding: "14px", borderRadius: "10px", border: "1px solid #334155", background: "#0f172a", color: "white", fontSize: "15px", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" },
  eyeBtn: { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "18px", padding: 0, opacity: 0.7 },
  btn: { width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: "#38bdf8", color: "#0f172a", fontSize: "16px", fontWeight: "700", cursor: "pointer", transition: "transform 0.1s, filter 0.2s", boxSizing: "border-box" },
  switchText: { marginTop: "20px", textAlign: "center", color: "#64748b", fontSize: "14px" },
  switchLink: { color: "#f8fafc", cursor: "pointer", fontWeight: "600", textDecoration: "underline" },
  githubBtn: { width: "100%", padding: "14px", background: "#18181b", color: "white", border: "1px solid #3f3f46", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "background 0.2s", boxSizing: "border-box" },
};

export default Auth;