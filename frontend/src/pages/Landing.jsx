import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const featureDetails = {
  onboarding: {
    title: "Frictionless Onboarding",
    content: "CodeCollab eliminates the traditional friction of email verification. You can authenticate via OAuth 2.0 using GitHub, or use our secure local registration. Local registration immediately issues a cryptographic Recovery Key, completely bypassing the need for SMTP servers, email harvesting, or vulnerable password-reset links."
  },
  security: {
    title: "Privacy-First Security",
    content: "Your data remains yours. By removing emails from the database schema entirely, we prevent data scraping and identity leaks. The Recovery Key acts as the sole cryptographic proof of ownership, ensuring a true zero-trust architecture where you hold the master key."
  },
  collaboration: {
    title: "Real-Time Synchronization",
    content: "Powered by Socket.IO, every keystroke, cursor movement, and file change is broadcasted in sub-150ms. Follow-Me mode locks participant viewports to the leader's scroll and cursor coordinates, making it perfect for pair programming, technical interviews, or guided code reviews."
  },
  dashboard: {
    title: "Dashboard Setup",
    content: "The dashboard is your control center. View active rooms, manage your created projects, and discover public workspaces. As a room leader, you can toggle room access between Public and Private on the fly, and manually approve or deny join requests from the waiting room to maintain complete control."
  },
  code: {
    title: "Code & Structure",
    content: "Built around the powerful Monaco Editor (the engine behind VS Code). It supports syntax highlighting, native code formatting, and dynamic font/minimap settings. The synchronized File Tree allows multiple users to create, rename, and delete files simultaneously without encountering race conditions."
  },
  execution: {
    title: "Docker Execution",
    content: "Code isn't just shared; it's executable. When you click Run, the backend packages your files and spins up isolated Docker containers for JavaScript, Python, C++, or Java. It securely injects your standard inputs (stdin) and streams the execution output directly back to the room's console."
  }
};

function Landing() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [selectedFeature, setSelectedFeature] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div style={s.page}>
      <style>{`
        /* Changed from 40px to 20px to prevent scrollbar recalculation jumping */
        .reveal { opacity: 0; transform: translateY(20px); transition: all 0.8s cubic-bezier(0.5, 0, 0, 1); }
        .reveal.active { opacity: 1; transform: translateY(0); }
        .delay-1 { transition-delay: 0.2s; }
        .delay-2 { transition-delay: 0.4s; }
        .delay-3 { transition-delay: 0.6s; }
        .delay-4 { transition-delay: 0.8s; }
        
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes scrollMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes typeLine { from { width: 0; opacity: 1; } to { width: 100%; opacity: 1; } }
        
        .typewriter { display: inline-block; overflow: hidden; white-space: nowrap; width: 0; opacity: 0; animation: typeLine 1.5s steps(40, end) forwards; animation-delay: inherit; }
        
        .spotlight-card { transition: all 0.3s ease; }
        .spotlight-card:hover { transform: translateY(-8px); border-color: rgba(56, 189, 248, 0.4) !important; box-shadow: 0 20px 40px -10px rgba(56, 189, 248, 0.15); }
        
        .learn-more-btn { background: transparent; border: none; color: #38bdf8; font-weight: bold; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 0; margin-top: 15px; transition: color 0.2s; }
        .learn-more-btn:hover { color: #818cf8; }
        .learn-more-btn span { transition: transform 0.2s; }
        .learn-more-btn:hover span { transform: translateX(4px); }
      `}</style>

      {/* Trapped Background Glows to prevent horizontal overflow without breaking vertical scroll */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
        <div style={s.glowOrb1}></div>
        <div style={s.glowOrb2}></div>
      </div>

      {/* Navbar */}
      <nav style={s.nav}>
        <h1 style={s.logo}>CodeCollab</h1>
        <div>
          {token ? (
            <button onClick={() => navigate("/dashboard")} style={s.primaryBtn}>Go to Dashboard 🚀</button>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => navigate("/auth")} style={s.secondaryBtn}>Login</button>
              <button onClick={() => navigate("/auth")} style={s.primaryBtn}>Start Coding</button>
            </div>
          )}
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <div style={s.hero} className="reveal">
        <h2 style={s.headline}>Code Together,<br/>Instantly.</h2>
        <p style={s.subtitle}>
          A highly performant, real-time collaborative IDE. Execute Python, C++, Java, and JS in secure Docker sandboxes with sub-150ms socket synchronization.
        </p>
        
        <div style={s.heroMockup} className="reveal delay-1">
          <div style={s.mockupHeader}>
            <div style={{ display: "flex", gap: "6px" }}>
              <div style={{...s.dot, background: "#ef4444"}}></div>
              <div style={{...s.dot, background: "#facc15"}}></div>
              <div style={{...s.dot, background: "#22c55e"}}></div>
            </div>
            <div style={s.mockupTab}>main.js</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "#22c55e", background: "rgba(34, 197, 94, 0.1)", padding: "4px 10px", borderRadius: "6px", fontWeight: "bold" }}>▶ Run Code</span>
            </div>
          </div>
          <div style={s.mockupBody}>
            <div style={s.mockupSidebar}>
              <div style={{ color: "#f8fafc", fontSize: "11px", fontWeight: "bold", marginBottom: "10px" }}>WORKSPACE</div>
              <div style={s.mockupLine}>📄 main.js</div>
              <div style={s.mockupLine}>📄 helper.py</div>
              <div style={{ marginTop: "20px", color: "#f8fafc", fontSize: "11px", fontWeight: "bold", marginBottom: "10px" }}>ONLINE (2)</div>
              <div style={{ color: "#38bdf8", marginBottom: "5px" }}>🟢 You</div>
              <div style={{ color: "#22c55e" }}>🟢 Interviewer</div>
            </div>
            <div style={s.mockupEditor}>
              <pre style={{ margin: 0, fontFamily: "monospace", color: "#e2e8f0", display: "flex", flexDirection: "column" }}>
                <span className="typewriter delay-1">
                  <span style={{ color: "#c678dd" }}>import</span> {"{ io }"} <span style={{ color: "#c678dd" }}>from</span> <span style={{ color: "#98c379" }}>"socket.io-client"</span>;
                </span>
                <span className="typewriter delay-2" style={{ visibility: "hidden" }}>_</span>
                <span className="typewriter delay-2">
                  <span style={{ color: "#c678dd" }}>const</span> <span style={{ color: "#e5c07b" }}>socket</span> = <span style={{ color: "#61afef" }}>io</span>(<span style={{ color: "#98c379" }}>"wss://codecollab.network"</span>);
                </span>
                <span className="typewriter delay-3" style={{ visibility: "hidden" }}>_</span>
                <span className="typewriter delay-3">
                  <span style={{ color: "#5c6370", fontStyle: "italic" }}>// Sub-150ms real-time keystroke sync</span>
                </span>
                <span className="typewriter delay-3">
                  <span style={{ color: "#e5c07b" }}>socket</span>.<span style={{ color: "#61afef" }}>on</span>(<span style={{ color: "#98c379" }}>"code-update"</span>, (<span style={{ color: "#d19a66" }}>newCode</span>) {`=>`} {"{"}
                </span>
                <span className="typewriter delay-4">
                  &nbsp;&nbsp;<span style={{ color: "#61afef" }}>syncWithMonaco</span>(newCode);
                </span>
                <span className="typewriter delay-4">
                  {"}"});<span style={{ borderRight: "2px solid #38bdf8", animation: "blink 1s step-end infinite", paddingRight: "2px", marginLeft: "2px" }}></span>
                </span>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* TECH STACK MARQUEE */}
      <div style={s.marqueeContainer} className="reveal delay-2">
        <div style={s.marqueeTrack}>
          {[...Array(2)].map((_, i) => (
            <span key={i} style={s.marqueeGroup}>
              {["React", "Node.js", "Socket.IO", "Docker", "MongoDB", "Express", "AWS S3", "C++", "Python", "Java"].map((tech, j) => (
                <span key={j} style={s.marqueeItem}>{tech}</span>
              ))}
            </span>
          ))}
        </div>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: "12px", marginTop: "15px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "bold" }}>
          Technologies utilized in building this architecture
        </p>
      </div>

      {/* 2. FEATURE: LIGHTNING ONBOARDING */}
      <div style={s.featureRow} className="reveal">
        <div style={s.featureTextSide}>
          <div style={s.featureBadge}>⚡ Frictionless Onboarding</div>
          <h2 style={s.featureHeadline}>Jump straight into the code.</h2>
          <p style={s.featureDesc}>
            No email verification hurdles. No waiting. Seamlessly authenticate using your existing GitHub account, or create a secure local profile in seconds to dive right into your workspace.
          </p>
          <button className="learn-more-btn" onClick={() => setSelectedFeature(featureDetails.onboarding)}>
            Technical Details <span>→</span>
          </button>
        </div>
        <div style={s.featureVisualSide}>
          <div style={{...s.replicaCard, animation: "float 6s ease-in-out infinite"}}>
            <h3 style={{ textAlign: "center", color: "#38bdf8", margin: "0 0 20px", fontSize: "22px" }}>CodeCollab</h3>
            <div style={s.replicaInput}>Username</div>
            <div style={{...s.replicaInput, display: "flex", justifyContent: "space-between"}}>
              <span>Password</span><span style={{ opacity: 0.5 }}>👁️</span>
            </div>
            <div style={{...s.replicaBtn, background: "#38bdf8", color: "#0f172a", marginBottom: "20px"}}>Create Account</div>
            <div style={{ display: "flex", alignItems: "center", margin: "20px 0", gap: "10px" }}>
              <div style={{ flex: 1, height: "1px", background: "#334155" }} />
              <span style={{ color: "#64748b", fontSize: "12px" }}>OR</span>
              <div style={{ flex: 1, height: "1px", background: "#334155" }} />
            </div>
            <div style={{...s.replicaBtn, background: "#18181b", color: "white", border: "1px solid #3f3f46"}}>
              Continue with GitHub
            </div>
          </div>
        </div>
      </div>

      {/* 3. FEATURE: SECURITY & RECOVERY */}
      <div style={{...s.featureRow, flexDirection: "row-reverse"}} className="reveal">
        <div style={s.featureTextSide}>
          <div style={s.featureBadge}>🔒 Privacy-First Security</div>
          <h2 style={s.featureHeadline}>Your identity, mathematically secured.</h2>
          <p style={s.featureDesc}>
            We respect your privacy. CodeCollab utilizes a zero-email infrastructure. Upon registration, you are issued a one-time cryptographic Recovery Key. You hold the master key to your data.
          </p>
          <button className="learn-more-btn" onClick={() => setSelectedFeature(featureDetails.security)}>
            Technical Details <span>→</span>
          </button>
        </div>
        <div style={s.featureVisualSide}>
          <div style={{...s.replicaCard, border: "1px solid rgba(16, 185, 129, 0.3)", animation: "float 6s ease-in-out infinite 1s"}}>
            <div style={{ textAlign: "center", color: "#10b981", fontWeight: "bold", marginBottom: "15px" }}>✓ Registration Complete</div>
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "10px", borderRadius: "8px", marginBottom: "15px" }}>
              <p style={{ color: "#fca5a5", fontSize: "12px", margin: 0, fontWeight: "bold", lineHeight: "1.4" }}>
                ⚠️ Save this key. We collect no emails. If you forget your password, this key is the ONLY way to recover your account. If lost, you are locked out forever.
              </p>
            </div>
            <div style={{ background: "#0f172a", padding: "15px", borderRadius: "8px", border: "1px dashed #334155", textAlign: "center", marginBottom: "15px" }}>
              <span style={{ fontSize: "20px", color: "#38bdf8", letterSpacing: "2px", fontWeight: "bold" }}>CC-A7F9-B2X4</span>
            </div>
            <div style={{...s.replicaBtn, background: "#334155", color: "white"}}>📋 Copy to Clipboard</div>
          </div>
        </div>
      </div>

      {/* 4. FEATURE: REAL-TIME COLLABORATION */}
      <div style={{...s.featureRow, alignItems: "flex-start"}} className="reveal">
        <div style={s.featureTextSide}>
          <div style={s.featureBadge}>🤝 Multiplayer Workspace</div>
          <h2 style={s.featureHeadline}>Flawless real-time synchronization.</h2>
          <p style={s.featureDesc}>
            Code simultaneously with sub-150ms latency. See exactly where your team is typing across the globe. Utilize <strong>Follow-Me Mode</strong> to lock participant screens to your cursor for guided pair programming.
          </p>
          <button className="learn-more-btn" onClick={() => setSelectedFeature(featureDetails.collaboration)}>
            Technical Details <span>→</span>
          </button>
        </div>
        <div style={{...s.featureVisualSide, flexDirection: "column", gap: "20px"}}>
          <div style={{...s.miniIDE, transform: "translateX(-20px)", animation: "float 5s ease-in-out infinite"}}>
            <div style={s.miniIDEHeader}>
              <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <div style={{...s.dot, width: "10px", height: "10px", background: "#ef4444"}}></div>
                <div style={{...s.dot, width: "10px", height: "10px", background: "#facc15"}}></div>
                <div style={{...s.dot, width: "10px", height: "10px", background: "#22c55e"}}></div>
                <span style={{ marginLeft: "10px", color: "#64748b", fontSize: "11px" }}>Alice's Workspace</span>
              </div>
            </div>
            <div style={s.miniIDEBody}>
              <span style={{ color: "#c678dd" }}>function</span> <span style={{ color: "#61afef" }}>calculateRoute</span>() {"{"}<br/>
              &nbsp;&nbsp;<span style={{ color: "#e5c07b" }}>console</span>.<span style={{ color: "#61afef" }}>log</span>(<span style={{ color: "#98c379" }}>"Routing"</span>);<span style={{ borderRight: "2px solid #38bdf8", animation: "blink 1s step-end infinite", paddingRight: "2px" }}></span><br/>
              {"}"}
            </div>
          </div>
          <div style={{...s.miniIDE, transform: "translateX(20px)", animation: "float 5s ease-in-out infinite 1.5s"}}>
            <div style={s.miniIDEHeader}>
              <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <div style={{...s.dot, width: "10px", height: "10px", background: "#ef4444"}}></div>
                <div style={{...s.dot, width: "10px", height: "10px", background: "#facc15"}}></div>
                <div style={{...s.dot, width: "10px", height: "10px", background: "#22c55e"}}></div>
                <span style={{ marginLeft: "10px", color: "#64748b", fontSize: "11px" }}>Bob's Workspace</span>
              </div>
            </div>
            <div style={s.miniIDEBody}>
              <span style={{ color: "#c678dd" }}>function</span> <span style={{ color: "#61afef" }}>calculateRoute</span>() {"{"}<br/>
              &nbsp;&nbsp;<span style={{ color: "#e5c07b" }}>console</span>.<span style={{ color: "#61afef" }}>log</span>(<span style={{ color: "#98c379" }}>"Routing"</span>);
              <span style={{ position: "relative", display: "inline-block", borderLeft: "2px solid #38bdf8", height: "14px", marginLeft: "2px" }}>
                 <span style={{ position: "absolute", top: "-18px", left: "0", background: "#38bdf8", color: "#0f172a", fontSize: "9px", padding: "2px 5px", borderRadius: "3px", fontWeight: "bold" }}>Alice</span>
              </span><br/>
              {"}"}
            </div>
          </div>
        </div>
      </div>

      {/* 5. AESTHETIC WORKFLOW */}
      <div style={s.workflowSection}>
        <h2 style={{ textAlign: "center", fontSize: "40px", color: "#f8fafc", marginBottom: "60px", letterSpacing: "-0.5px" }} className="reveal">
          The CodeCollab Workflow
        </h2>
        
        <div style={s.aestheticGrid}>
          <div style={s.aestheticCard} className="reveal delay-1 spotlight-card">
            <div style={s.watermarkNum}>01</div>
            <h3 style={s.aestheticTitle}>Dashboard Setup</h3>
            <p style={s.aestheticText}>Manage your active projects in the aesthetic grid. Create public rooms for anyone to join, or lock them down as private to carefully approve incoming requests.</p>
            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
               <span style={{ background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>Room Settings</span>
               <span style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>Access Control</span>
            </div>
            <button className="learn-more-btn" onClick={() => setSelectedFeature(featureDetails.dashboard)}>
              Read Details <span>→</span>
            </button>
          </div>

          <div style={s.aestheticCard} className="reveal delay-2 spotlight-card">
            <div style={s.watermarkNum}>02</div>
            <h3 style={s.aestheticTitle}>Code & Structure</h3>
            <p style={s.aestheticText}>Navigate the synchronized File Tree. Create, rename, or delete files on the fly. Format your code natively with a single click using Monaco's built-in engine.</p>
            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
               <span style={{ background: "rgba(167, 139, 250, 0.1)", color: "#a78bfa", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>Prettier Formatting</span>
               <span style={{ background: "rgba(244, 63, 94, 0.1)", color: "#f43f5e", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>File Tree Sync</span>
            </div>
            <button className="learn-more-btn" onClick={() => setSelectedFeature(featureDetails.code)}>
              Read Details <span>→</span>
            </button>
          </div>

          <div style={s.aestheticCard} className="reveal delay-3 spotlight-card">
            <div style={s.watermarkNum}>03</div>
            <h3 style={s.aestheticTitle}>Docker Execution</h3>
            <p style={s.aestheticText}>Need to test? Provide standard inputs (stdin) for `cin` or `input()`, click Run, and watch the secure backend compile and execute your code live.</p>
            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
               <span style={{ background: "rgba(250, 204, 21, 0.1)", color: "#facc15", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>Stdin Support</span>
               <span style={{ background: "rgba(14, 165, 233, 0.1)", color: "#0ea5e9", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>Sandboxed Runtimes</span>
            </div>
            <button className="learn-more-btn" onClick={() => setSelectedFeature(featureDetails.execution)}>
              Read Details <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* FEATURE DETAILS MODAL */}
      {selectedFeature && (
        <div style={s.modalOverlay} onClick={() => setSelectedFeature(null)}>
          <div style={s.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "22px" }}>{selectedFeature.title}</h3>
              <button onClick={() => setSelectedFeature(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "20px" }}>✕</button>
            </div>
            <p style={{ color: "#e2e8f0", fontSize: "15px", lineHeight: "1.7", margin: 0 }}>
              {selectedFeature.content}
            </p>
            <button onClick={() => setSelectedFeature(null)} style={{ ...s.primaryBtn, width: "100%", marginTop: "25px" }}>Close</button>
          </div>
        </div>
      )}

      {/* 6. CTA FOOTER */}
      <div style={{ textAlign: "center", padding: "100px 20px" }} className="reveal">
        <h2 style={{ fontSize: "40px", color: "white", marginBottom: "30px", letterSpacing: "-0.5px" }}>Ready to start building?</h2>
        <button onClick={() => navigate("/auth")} style={{...s.primaryBtn, padding: "18px 45px", fontSize: "18px", boxShadow: "0 0 30px rgba(56,189,248,0.3)"}}>
          Enter Workspace
        </button>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#020617", color: "white", fontFamily: "system-ui, -apple-system, sans-serif", position: "relative" },
  glowOrb1: { position: "absolute", top: "-10%", left: "-10%", width: "800px", height: "800px", background: "radial-gradient(circle, rgba(56,189,248,0.12) 0%, rgba(0,0,0,0) 60%)", filter: "blur(60px)" },
  glowOrb2: { position: "absolute", top: "50%", right: "-10%", width: "700px", height: "700px", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(0,0,0,0) 60%)", filter: "blur(60px)" },
  
  nav: { position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  logo: { margin: 0, fontSize: "24px", color: "#38bdf8", fontWeight: "800", letterSpacing: "-0.5px" },
  primaryBtn: { background: "#38bdf8", color: "#0f172a", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" },
  secondaryBtn: { background: "transparent", color: "#f8fafc", border: "1px solid #334155", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" },
  
  hero: { position: "relative", zIndex: 1, textAlign: "center", padding: "80px 20px 60px", maxWidth: "900px", margin: "0 auto" },
  headline: { fontSize: "65px", fontWeight: "900", margin: "0 0 25px", background: "linear-gradient(to right, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: "1.1", letterSpacing: "-2px" },
  subtitle: { fontSize: "18px", color: "#94a3b8", lineHeight: "1.6", margin: "0 auto 50px", maxWidth: "700px" },
  
  heroMockup: { background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(12px)", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", textAlign: "left" },
  mockupHeader: { background: "#0b1120", padding: "12px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155" },
  dot: { width: "12px", height: "12px", borderRadius: "50%" },
  mockupTab: { background: "#1e293b", color: "#38bdf8", fontSize: "12px", padding: "4px 12px", borderRadius: "4px", border: "1px solid #334155", fontWeight: "bold" },
  mockupBody: { display: "flex", height: "300px" },
  mockupSidebar: { width: "160px", background: "rgba(2, 6, 23, 0.5)", borderRight: "1px solid #334155", padding: "15px", fontSize: "13px", color: "#64748b" },
  mockupLine: { marginBottom: "8px", cursor: "default" },
  mockupEditor: { position: "relative", padding: "20px", flex: 1, fontSize: "14px", lineHeight: "1.6", overflow: "hidden" },
  
  marqueeContainer: { overflow: "hidden", whiteSpace: "nowrap", width: "100%", padding: "40px 0 20px", background: "rgba(15, 23, 42, 0.3)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", marginTop: "40px", boxSizing: "border-box" },
  marqueeTrack: { display: "inline-block", animation: "scrollMarquee 25s linear infinite" },
  marqueeGroup: { display: "inline-flex", gap: "80px", paddingRight: "80px", alignItems: "center" },
  marqueeItem: { fontSize: "22px", fontWeight: "900", color: "#334155", letterSpacing: "1.5px", textTransform: "uppercase" },

  featureRow: { position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "60px", padding: "100px 20px", maxWidth: "1100px", margin: "0 auto", boxSizing: "border-box" },
  featureTextSide: { flex: "1 1 400px" },
  featureVisualSide: { flex: "1 1 400px", display: "flex", justifyContent: "center", perspective: "1000px" },
  featureBadge: { display: "inline-block", background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", padding: "8px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", marginBottom: "20px", border: "1px solid rgba(56, 189, 248, 0.2)" },
  featureHeadline: { fontSize: "40px", color: "#f8fafc", margin: "0 0 20px", lineHeight: "1.1", letterSpacing: "-1px" },
  featureDesc: { fontSize: "17px", color: "#94a3b8", lineHeight: "1.7", margin: 0 },
  
  replicaCard: { width: "100%", maxWidth: "380px", background: "rgba(30, 41, 59, 0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "35px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" },
  replicaInput: { background: "#0f172a", border: "1px solid #475569", padding: "14px", borderRadius: "10px", fontSize: "14px", color: "#64748b", marginBottom: "15px" },
  replicaBtn: { padding: "14px", borderRadius: "10px", fontSize: "15px", fontWeight: "bold", textAlign: "center", cursor: "default" },
  
  miniIDE: { width: "100%", maxWidth: "400px", background: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(8px)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", boxShadow: "0 15px 30px rgba(0,0,0,0.5)" },
  miniIDEHeader: { background: "#0b1120", padding: "10px 15px", borderBottom: "1px solid #334155" },
  miniIDEBody: { padding: "20px", fontSize: "13px", fontFamily: "monospace", color: "#e2e8f0", height: "100px", lineHeight: "1.6", overflow: "hidden" },

  workflowSection: { position: "relative", zIndex: 1, padding: "100px 20px", marginTop: "40px" },
  aestheticGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px", maxWidth: "1100px", margin: "0 auto" },
  aestheticCard: { position: "relative", background: "rgba(30, 41, 59, 0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "20px", padding: "40px", overflow: "hidden" },
  watermarkNum: { position: "absolute", top: "-20px", right: "-10px", fontSize: "140px", fontWeight: "900", color: "rgba(255,255,255,0.03)", lineHeight: "1", zIndex: 0, pointerEvents: "none" },
  aestheticTitle: { position: "relative", fontSize: "24px", color: "#f8fafc", margin: "0 0 15px", zIndex: 1 },
  aestheticText: { position: "relative", fontSize: "15px", color: "#94a3b8", lineHeight: "1.7", margin: "0", zIndex: 1 },

  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(2, 6, 23, 0.8)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 },
  modalCard: { background: "#1e293b", padding: "30px", borderRadius: "16px", width: "500px", maxWidth: "90%", border: "1px solid #334155", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", animation: "reveal 0.3s ease-out forwards" },
};

export default Landing;