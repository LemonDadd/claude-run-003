import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useStore } from "./store/useStore";
import SelectPlayer from "./pages/SelectPlayer";
import CreateProfile from "./pages/CreateProfile";
import Home from "./pages/Home";
import GameContainer from "./pages/GameContainer";
import Reward from "./pages/Reward";
import Gallery from "./pages/Gallery";
import Parent from "./pages/Parent";

export default function App() {
  const boot = useStore((s) => s.boot);
  const loading = useStore((s) => s.loading);
  const activeProfileId = useStore((s) => s.activeProfileId);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (loading) {
    return (
      <div className="splash">
        <div className="splash-logo">🧮</div>
        <div className="splash-title">KidMath</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* 根路径：启动/选择玩家 */}
      <Route path="/" element={<SelectPlayer />} />
      <Route path="/create-profile" element={<CreateProfile />} />
      <Route
        path="/home"
        element={activeProfileId != null ? <Home /> : <Navigate to="/" replace />}
      />
      <Route
        path="/game/:gameType"
        element={
          activeProfileId != null ? <GameContainer /> : <Navigate to="/" replace />
        }
      />
      <Route
        path="/reward"
        element={activeProfileId != null ? <Reward /> : <Navigate to="/" replace />}
      />
      <Route
        path="/gallery"
        element={activeProfileId != null ? <Gallery /> : <Navigate to="/" replace />}
      />
      <Route path="/parent" element={<Parent />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
