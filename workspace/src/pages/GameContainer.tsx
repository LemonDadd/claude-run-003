import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GAMES, QUESTION_COUNT, effectiveLevel, starsForRound } from "../lib/gameConfig";
import type { GameType, RoundResult } from "../types";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import { stopSpeak } from "../lib/feedback";
import Fishing from "../games/Fishing";
import Compare from "../games/Compare";
import Orchard from "../games/Orchard";
import ShapesGame from "../games/ShapesGame";
import Patterns from "../games/Patterns";
import ClockGame from "../games/ClockGame";

const VALID: GameType[] = [
  "fishing",
  "compare",
  "orchard",
  "shapes",
  "patterns",
  "clock",
];

export default function GameContainer() {
  const { gameType } = useParams();
  const navigate = useNavigate();
  const profile = useStore((s) => s.activeProfile);
  const finishRound = useStore((s) => s.finishRound);

  const [saving, setSaving] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resting, setResting] = useState(false);
  const elapsedRef = useRef(0);
  const profileIdRef = useRef<number | null>(null);
  profileIdRef.current = profile?.id ?? null;

  const type = gameType as GameType;
  const valid = VALID.includes(type);
  const level = profile ? effectiveLevel(profile) : 1;
  const meta = useMemo(() => GAMES.find((g) => g.type === type), [type]);
  const roundKey = useMemo(() => `${type}-${Date.now()}`, [type]);

  // ---------- 每日时长 ----------
  useEffect(() => {
    let alive = true;
    api
      .getSettings()
      .then((s) => api.getTodayUsage(profile!.id).then((used) => ({ s, used })))
      .then(({ s, used }) => {
        if (!alive) return;
        setRemaining(Math.max(0, s.daily_limit_minutes * 60 - used));
      })
      .catch(() => {
        if (alive) setRemaining(null);
      });
    return () => {
      alive = false;
    };
  }, [profile]);

  // 每 10 秒累计并落库一次游玩时长
  useEffect(() => {
    if (!profile || remaining == null) return;
    const flush = () => {
      const secs = elapsedRef.current;
      if (secs > 0 && profileIdRef.current != null) {
        elapsedRef.current = 0;
        void api.addPlaySeconds(profileIdRef.current, secs);
      }
    };
    const timer = window.setInterval(() => {
      elapsedRef.current += 10;
      setRemaining((r) => (r == null ? r : Math.max(0, r - 10)));
      if (!document.hidden) flush();
    }, 10000);
    return () => {
      window.clearInterval(timer);
      flush();
    };
    // 只在进入游戏 / 拿到时长设置时启动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, remaining == null]);

  // 页面隐藏时立即结算时长
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && profile && elapsedRef.current > 0) {
        const secs = elapsedRef.current;
        elapsedRef.current = 0;
        void api.addPlaySeconds(profile.id, secs);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [profile]);

  // 到限：温和提示 → 回首页（进度已在落库）
  useEffect(() => {
    if (remaining != null && remaining <= 0 && !resting) {
      setResting(true);
      stopSpeak();
      if (profile && elapsedRef.current > 0) {
        const secs = elapsedRef.current;
        elapsedRef.current = 0;
        void api.addPlaySeconds(profile.id, secs);
      }
      window.setTimeout(() => navigate("/home"), 2600);
    }
  }, [remaining, resting, navigate, profile]);

  // 离开页面时把未上报的时长补写
  useEffect(() => {
    return () => {
      if (profile && elapsedRef.current > 0) {
        const secs = elapsedRef.current;
        elapsedRef.current = 0;
        void api.addPlaySeconds(profile.id, secs);
      }
    };
  }, [profile]);

  const handleDone = useCallback(
    async (correct: number, total: number) => {
      if (saving || !profile) return;
      setSaving(true);
      stopSpeak();
      const stars = starsForRound(correct, total);
      const points = correct * 10 + stars * 5;
      const result: RoundResult = {
        gameType: type,
        level,
        correct,
        total,
        stars,
        points,
      };
      await finishRound(result);
      navigate("/reward");
    },
    [finishRound, level, navigate, profile, saving, type]
  );

  if (!valid || !meta) {
    return (
      <div className="page">
        <p className="prompt">这个游戏还在准备中～</p>
        <div style={{ textAlign: "center" }}>
          <button className="btn blue big" onClick={() => navigate("/home")}>
            回到首页
          </button>
        </div>
      </div>
    );
  }

  const questionCount = QUESTION_COUNT[level] ?? 6;
  const remainText =
    remaining == null
      ? null
      : `⏰ ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <div className="page">
      <div className="game-header">
        <button
          className="icon-btn"
          onClick={() => {
            stopSpeak();
            navigate("/home");
          }}
        >
          🏠 首页
        </button>
        <div className="progress-dots" aria-hidden>
          {Array.from({ length: questionCount }, (_, i) => (
            <span key={i} className="dot" />
          ))}
        </div>
        {remainText && <div className="score-pill">{remainText}</div>}
        <div className="star-pill">
          {meta.emoji} {meta.name} · Lv.{level}
        </div>
      </div>

      <GameRouter key={roundKey} type={type} level={level} onDone={handleDone} />

      {resting && (
        <div className="rest-overlay">
          <div className="rest-card">
            <div className="remoji">😴🌙</div>
            <h2>该休息啦</h2>
            <p>今天玩得很棒！小眼睛歇一歇，我们明天再见～</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** 当前题进度点由各游戏自身维护成本较高，这里通过 DOM class 同步 */
function GameRouter({
  type,
  level,
  onDone,
}: {
  type: GameType;
  level: number;
  onDone: (c: number, t: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      // 各游戏 hint 文本含「第 x / n 题」，据此更新顶部圆点
      const dots = document.querySelectorAll<HTMLElement>(".progress-dots .dot");
      if (!dots.length) return;
      const m = ref.current
        ?.querySelector(".hint")
        ?.textContent?.match(/第\s*(\d+)\s*\/\s*(\d+)/);
      if (!m) return;
      const cur = Number(m[1]);
      dots.forEach((d, i) => {
        d.classList.toggle("done", i + 1 < cur);
        d.classList.toggle("current", i + 1 === cur);
      });
    };
    const t = window.setInterval(update, 200);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div ref={ref} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {type === "fishing" && <Fishing level={level} onDone={onDone} />}
      {type === "compare" && <Compare level={level} onDone={onDone} />}
      {type === "orchard" && <Orchard level={level} onDone={onDone} />}
      {type === "shapes" && <ShapesGame level={level} onDone={onDone} />}
      {type === "patterns" && <Patterns level={level} onDone={onDone} />}
      {type === "clock" && <ClockGame level={level} onDone={onDone} />}
    </div>
  );
}
