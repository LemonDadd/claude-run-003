import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { GAMES, WIP_GAMES } from "../lib/gameConfig";
import { ITEM_CATALOG } from "../lib/items";
import { playFanfare, playStar } from "../lib/feedback";

export default function Reward() {
  const navigate = useNavigate();
  const lastRound = useStore((s) => s.lastRound);
  const newAchievements = useStore((s) => s.newAchievements);
  const newItems = useStore((s) => s.newItems);
  const profile = useStore((s) => s.activeProfile);

  useEffect(() => {
    playFanfare();
    const timers = [
      window.setTimeout(() => playStar(), 400),
      window.setTimeout(() => playStar(), 800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const game = useMemo(
    () => [...GAMES, ...WIP_GAMES].find((g) => g.type === lastRound?.gameType),
    [lastRound]
  );

  if (!lastRound || !profile) {
    return (
      <div className="reward-wrap">
        <p className="prompt">还没有完成的回合～</p>
        <button className="btn blue big" onClick={() => navigate("/home")}>
          回到首页
        </button>
      </div>
    );
  }

  const acc = Math.round((lastRound.correct / lastRound.total) * 100);

  return (
    <div className="reward-wrap">
      <div className="card reward-card">
        <h1 style={{ margin: 0, fontSize: 44 }}>
          {game?.emoji} {game?.name}
        </h1>

        <div className="big-stars" aria-label={`获得 ${lastRound.stars} 颗星`}>
          {[0, 1].map((i) => (
            <span
              key={i}
              className={i < lastRound.stars ? "earned" : ""}
              style={{
                animationDelay: `${0.3 + i * 0.35}s`,
                filter: i < lastRound.stars ? "none" : "grayscale(1) opacity(0.35)",
              }}
            >
              ⭐
            </span>
          ))}
        </div>

        <div className="reward-stat">
          一次答对 {lastRound.correct} / {lastRound.total} 题 · 正确率 {acc}%
        </div>
        <div className="reward-stat">累计星星 ⭐ {profile.stars_total}</div>
        <div className="hint">答对得分 {lastRound.points} 分 · Level {lastRound.level}</div>

        {newAchievements.length > 0 && (
          <div style={{ width: "100%" }}>
            <div className="section-title">🏅 新成就</div>
            <div className="unlock-row">
              {newAchievements.map((a) => (
                <span key={a.code} className="unlock-chip">
                  {a.icon} {a.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {newItems.length > 0 && (
          <div style={{ width: "100%" }}>
            <div className="section-title">🎁 新饰品解锁</div>
            <div className="unlock-row">
              {newItems.map((code) => {
                const item = ITEM_CATALOG.find((i) => i.code === code);
                return (
                  <span key={code} className="unlock-chip">
                    {item?.emoji} {item?.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="reward-actions" style={{ marginTop: 10 }}>
          <button
            className="btn green big"
            onClick={() => navigate(`/game/${lastRound.gameType}`)}
          >
            🔁 再玩一次
          </button>
          <button
            className="btn big"
            onClick={() => {
              if (newItems.length > 0) navigate("/gallery");
              else navigate("/home");
            }}
          >
            {newItems.length > 0 ? "🎒 去装扮" : "🏠 回首页"}
          </button>
        </div>
      </div>
    </div>
  );
}
