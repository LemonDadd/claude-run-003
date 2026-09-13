import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import {
  COMING_SOON,
  GAMES,
  WIP_GAMES,
  ageFromBirthday,
  effectiveLevel,
} from "../lib/gameConfig";
import { playClick } from "../lib/feedback";
import { api } from "../lib/api";
import OutfitAvatar from "../components/OutfitAvatar";

export default function Home() {
  const navigate = useNavigate();
  const profile = useStore((s) => s.activeProfile);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    Promise.all([api.getSettings(), api.getTodayUsage(profile.id)])
      .then(([s, used]) => {
        if (alive) setRemaining(Math.max(0, s.daily_limit_minutes * 60 - used));
      })
      .catch(() => alive && setRemaining(null));
    const timer = window.setInterval(
      () => setRemaining((r) => (r == null ? r : Math.max(0, r - 10))),
      10000
    );
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [profile]);

  if (!profile) return null;
  const age = ageFromBirthday(profile.birthday);
  const level = effectiveLevel(profile);
  const timeUp = remaining != null && remaining <= 0;

  const mm = remaining == null ? "" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <div className="page">
      <div className="home-header">
        <OutfitAvatar
          avatarId={profile.avatar}
          outfit={{
            hat: profile.outfit_hat ?? null,
            glasses: profile.outfit_glasses ?? null,
            background: profile.outfit_background ?? null,
            pet: profile.outfit_pet ?? null,
          }}
        />
        <div className="who" style={{ flex: 1 }}>
          <h2>{profile.nickname}</h2>
          <span>
            {age} 岁 · 当前难度 Level {level}
            {profile.level_override != null ? "（家长调整）" : "（按年龄推荐）"}
          </span>
        </div>
        {remaining != null && (
          <div className="star-pill" style={timeUp ? { background: "#fee2e2", color: "#991b1b" } : undefined}>
            {timeUp ? "😴 今天该休息啦" : `⏰ 还能玩 ${mm}`}
          </div>
        )}
        <div className="star-pill">⭐ {profile.stars_total}</div>
        <div className="home-actions">
          <button
            className="icon-btn"
            onClick={() => {
              playClick();
              navigate("/gallery");
            }}
          >
            🎒 装扮
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              playClick();
              navigate("/");
            }}
          >
            🔄 换人
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              playClick();
              navigate("/parent");
            }}
          >
            👪 家长
          </button>
        </div>
      </div>

      <div className="home-scroll">
        <div className="game-grid">
          {GAMES.map((g) => (
            <button
              key={g.type}
              className="game-tile"
              style={{
                background: g.color,
                opacity: timeUp ? 0.5 : 1,
              }}
              onClick={() => {
                if (timeUp) return;
                playClick();
                navigate(`/game/${g.type}`);
              }}
              aria-disabled={timeUp}
            >
              <span className="gicon">{g.emoji}</span>
              <span className="gname">{g.name}</span>
              <span className="gdesc">{g.desc}</span>
              <span className="level-badge">Level {level}</span>
            </button>
          ))}
        </div>

        <div className="soon-row">
          <span className="soon-label">即将推出：</span>
          {WIP_GAMES.map((g) => (
            <button
              key={g.type}
              className="soon-tag soon-playable"
              style={{
                border: "3px dashed #f472b6",
                background: "#fdf2f8",
                color: "#be185d",
                cursor: "pointer",
              }}
              onClick={() => {
                if (timeUp) return;
                playClick();
                navigate(`/game/${g.type}`);
              }}
            >
              {g.emoji} {g.name} · 可试玩
            </button>
          ))}
          {COMING_SOON.map((t) => (
            <span key={t} className="soon-tag">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
