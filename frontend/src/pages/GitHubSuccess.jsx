import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function GitHubSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const username = searchParams.get("username");
    const email = searchParams.get("email");
    const id = searchParams.get("id");

    if (token && username) {
      // Save to localStorage exactly like normal login
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify({ id, username, email }));
      navigate("/");
    } else {
      navigate("/auth?error=github_failed");
    }
  }, []);

  return (
    <div style={{
      height: "100vh", background: "#0f172a",
      display: "flex", justifyContent: "center",
      alignItems: "center", color: "white", fontFamily: "Arial"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "15px" }}>⏳</div>
        <p style={{ color: "#38bdf8", fontSize: "18px" }}>
          Logging you in with GitHub...
        </p>
      </div>
    </div>
  );
}

export default GitHubSuccess;