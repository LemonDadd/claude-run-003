import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import {
  COMING_SOON,
  GAMES,
  ageFromBirthday,
  effectiveLevel,
} from "../lib/gameConfig";
import { AVATARS, ITEM_CATALOG } from "../lib/items";
import { playClick } from "../lib/feedback";
import { api } from "../lib/api";

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
  const avatar = AVATARS.find((a) => a.id === profile.avatar);
  const age = ageFromBirthday(profile.birthday);
  const level = effectiveLevel(profile);
  const timeUp = remaining != null && remaining <= 0;

  const wornHat = ITEM_CATALOG.find((i) => i.code === profile.outfit_hat)?.emoji;
  const wornGlasses = ITEM_CATALOG.find((i) => i.code === profile.outfit_glasses)?.emoji;
  const wornBg = ITEM_CATALOG.find((i) => i.code === profile.outfit_background)?.emoji;
  const wornPet = ITEM_CATALOG.find((i) => i.code === profile.outfit_pet)?.emoji;

  const mm = remaining == null ? "" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <div className="page">
      <div className="home-header">
        <div
          style={{
            position: "relative",
            width: 86,
            height: 86,
            borderRadius: "50%",
            background: "#fef3c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            flexShrink: 0,
          }}
        >
          {wornBg && (
            <span style={{ position: "absolute", fontSize: 30, right: -6, bottom: -6 }}>
              {wornBg}
            </span>
          )}
          <span>{avatar?.emoji ?? "🧒"}</span>
          {wornHat && (
            <span style={{ position: "absolute", fontSize: 30, top: -14 }}>{wornHat}</span>
          )}
          {wornGlasses && (
            <span style={{ position: "absolute", fontSize: 24, top: 30 }}>{wornGlasses}</span>
          )}
          {wornPet && (
            <span style={{ position: "absolute", fontSize: 30, left: -18, bottom: -4 }}>
              {wornPet}
            </span>
          )}
        </div>
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
