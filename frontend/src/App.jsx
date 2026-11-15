import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Room from "./pages/Room";
import AdminDashboard from "./pages/AdminDashboard";
import GitHubSuccess from "./pages/GitHubSuccess";
import GitHubMerge from "./pages/GitHubMerge";
import Guide from "./pages/Guide";

function App() {
  return (
    <BrowserRouter>
      {/* Global Toast Configuration for sleek dark-mode notifications */}
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: { background: "#1e293b", color: "#f8fafc", border: "1px solid #334155" },
          success: { iconTheme: { primary: "#10b981", secondary: "#1e293b" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#1e293b" } },
        }} 
      />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Home />} />
        <Route path="/room" element={<Room />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/guide" element={<Guide />} />

        {/* GitHub OAuth Routes */}
        <Route path="/auth/github/success" element={<GitHubSuccess />} />
        <Route path="/auth/github/merge" element={<GitHubMerge />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;