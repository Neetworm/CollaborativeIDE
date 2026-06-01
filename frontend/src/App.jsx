import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Room from "./pages/Room";
import AdminDashboard from "./pages/AdminDashboard";
import GitHubSuccess from "./pages/GitHubSuccess";
import GitHubMerge from "./pages/GitHubMerge";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Home />} />
        <Route path="/room" element={<Room />} />
        <Route path="/admin" element={<AdminDashboard />} />

        {/* GitHub OAuth Routes */}
        <Route path="/auth/github/success" element={<GitHubSuccess />} />
        <Route path="/auth/github/merge" element={<GitHubMerge />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;