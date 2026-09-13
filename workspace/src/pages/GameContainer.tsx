import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GAMES, WIP_GAMES, QUESTION_COUNT, effectiveLevel, starsForRound } from "../lib/gameConfig";
import type { GameType, RoundResult } from "../types";
import type { RoundProgress } from "../games/useRound";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import { stopSpeak } from "../lib/feedback";
import Fishing from "../games/Fishing";
import Compare from "../games/Compare";
import Orchard from "../games/Orchard";
import ShapesGame from "../games/ShapesGame";
import Patterns from "../games/Patterns";
import ClockGame from "../games/ClockGame";
import MultiplyGame from "../games/MultiplyGame";

const VALID: GameType[] = [
  "fishing",
  "compare",
  "orchard",
  "shapes",
  "patterns",
  "clock",
  "multiply",
];

export default function GameContainer() {
  const { gameType } = useParams();
  const navigate = useNavigate();
  const profile = useStore((s) => s.activeProfile);
  const finishRound = useStore((s) => s.finishRound);
  const savePartialRound = useStore((s) => s.savePartialRound);

  const [saving, setSaving] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resting, setResting] = useState(false);
  const elapsedRef = useRef(0);
  const profileIdRef = useRef<number | null>(null);
  profileIdRef.current = profile?.id ?? null;
  /** 实时回合进度，供到限时保存部分回合 */
  const progressRef = useRef<RoundProgress>({
    index: 0,
    answered: 0,
    firstTryCorrect: 0,
  });
  const [progress, setProgress] = useState<RoundProgress>(progressRef.current);
  const restingRef = useRef(false);

  const type = gameType as GameType;
  const valid = VALID.includes(type);
  const meta = useMemo(
    () => [...GAMES, ...WIP_GAMES].find((g) => g.type === type),
    [type]
  );
  const baseLevel = profile ? effectiveLevel(profile) : 1;
  // 占位游戏只支持部分难度，按其 maxLevel 钳制
  const level = meta?.maxLevel ? Math.min(baseLevel, meta.maxLevel) : baseLevel;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, remaining == null]);

  // 页面隐藏时立即结算时长
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && profileIdRef.current != null && elapsedRef.current > 0) {
        const secs = elapsedRef.current;
        elapsedRef.current = 0;
        void api.addPlaySeconds(profileIdRef.current, secs);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const handleProgress = useCallback((p: RoundProgress) => {
    progressRef.current = p;
    setProgress(p);
  }, []);

  // 到限：先把已作答的部分回合落库，再温和提示回首页
  useEffect(() => {
    if (remaining == null || remaining > 0 || restingRef.current) return;
    restingRef.current = true;
    setResting(true);
    stopSpeak();

    const run = async () => {
      if (profileIdRef.current != null && elapsedRef.current > 0) {
        const secs = elapsedRef.current;
        elapsedRef.current = 0;
        await api.addPlaySeconds(profileIdRef.current, secs);
      }
      const p = progressRef.current;
      if (p.answered > 0 && !saving) {
        if (p.answered >= QUESTION_COUNT[level]) {
          // 整轮题目均已作答：正常结算（评星 + 成就），不再走部分回合
          await finishRound({
            gameType: type,
            level,
            correct: p.firstTryCorrect,
            total: QUESTION_COUNT[level],
            stars: starsForRound(p.firstTryCorrect, QUESTION_COUNT[level]),
            points: p.firstTryCorrect * 10,
          });
        } else {
          // 未完成：按部分回合保存（不评星、不计入回合类成就）
          await savePartialRound({
            gameType: type,
            level,
            answered: p.answered,
            correct: p.firstTryCorrect,
          });
        }
      }
      window.setTimeout(() => navigate("/home"), 2600);
    };
    void run();
  }, [
    remaining,
    navigate,
    type,
    level,
    savePartialRound,
    finishRound,
    saving,
  ]);

  const handleDone = useCallback(
    async (correctCount: number, totalCount: number) => {
      if (saving || !profile || restingRef.current) return;
      setSaving(true);
      stopSpeak();
      const stars = starsForRound(correctCount, totalCount);
      const points = correctCount * 10 + stars * 5;
      const result: RoundResult = {
        gameType: type,
        level,
        correct: correctCount,
        total: totalCount,
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
            <span
              key={i}
              className={`dot ${i < progress.index ? "done" : ""} ${
                i === progress.index ? "current" : ""
              }`}
            />
          ))}
        </div>
        {remainText && <div className="score-pill">{remainText}</div>}
        <div className="star-pill">
          {meta.emoji} {meta.name} · Lv.{level}
        </div>
      </div>

      <GameRouter
        key={roundKey}
        type={type}
        level={level}
        onDone={handleDone}
        onProgress={handleProgress}
      />

      {resting && (
        <div className="rest-overlay">
          <div className="rest-card">
            <div className="remoji">😴🌙</div>
            <h2>该休息啦</h2>
            <p>
              今天玩得很棒，已经答了 {progress.answered} 题！小眼睛歇一歇，我们明天再见～
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function GameRouter({
  type,
  level,
  onDone,
  onProgress,
}: {
  type: GameType;
  level: number;
  onDone: (c: number, t: number) => void;
  onProgress: (p: RoundProgress) => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {type === "fishing" && <Fishing level={level} onDone={onDone} onProgress={onProgress} />}
      {type === "compare" && <Compare level={level} onDone={onDone} onProgress={onProgress} />}
      {type === "orchard" && <Orchard level={level} onDone={onDone} onProgress={onProgress} />}
      {type === "shapes" && <ShapesGame level={level} onDone={onDone} onProgress={onProgress} />}
      {type === "patterns" && <Patterns level={level} onDone={onDone} onProgress={onProgress} />}
      {type === "clock" && <ClockGame level={level} onDone={onDone} onProgress={onProgress} />}
      {type === "multiply" && (
        <MultiplyGame level={level} onDone={onDone} onProgress={onProgress} />
      )}
    </div>
  );
}
