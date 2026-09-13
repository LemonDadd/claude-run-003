import { useEffect, useMemo, useState } from "react";
import { FeedbackLayer, useFeedback } from "../components/Feedback";
import SpeakPrompt from "../components/SpeakPrompt";
import { QUESTION_COUNT, makeRng, randInt } from "../lib/gameConfig";
import { useRound } from "./useRound";

interface CompareQ {
  left: number;
  right: number;
  emoji: string;
}

const ITEM_EMOJIS = ["🍎", "🍓", "🍌", "🍇", "🌸", "⭐", "🐥", "🍄", "🥕"];

function maxByLevel(level: number) {
  return [5, 8, 10, 15, 20][level - 1] ?? 8;
}

export function buildQuestions(level: number): CompareQ[] {
  const rng = makeRng();
  const max = maxByLevel(level);
  return Array.from({ length: QUESTION_COUNT[level] ?? 6 }, () => {
    // 先从可行范围里取数量，保证一定能找到满足差距的另一边
    const minGap = level <= 2 ? 1 : level === 3 ? 2 : 1;
    const lo = minGap + 1;
    const left = randInt(lo, max, rng);
    const candidates: number[] = [];
    for (let n = 1; n <= max; n++) {
      if (Math.abs(left - n) >= minGap) candidates.push(n);
    }
    const right = candidates[randInt(0, candidates.length - 1, rng)];
    return {
      left,
      right,
      emoji: ITEM_EMOJIS[randInt(0, ITEM_EMOJIS.length - 1, rng)],
    };
  });
}

export default function Compare({
  level,
  onDone,
}: {
  level: number;
  onDone: (c: number, t: number) => void;
}) {
  const questions = useMemo(() => buildQuestions(level), [level]);
  const { idx, correct, locked, submit, total } = useRound(questions, onDone);
  const q = questions[idx];
  const fb = useFeedback();
  const moreSide: "left" | "right" = q.left > q.right ? "left" : "right";
  const [flashedSide, setFlashedSide] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    setFlashedSide(null);
  }, [idx]);

  const pickSide = (side: "left" | "right", el: HTMLElement) => {
    if (locked) return;
    const result = submit(side === moreSide);
    if (result === "right") {
      setFlashedSide(side);
      fb.good(el);
    } else {
      fb.gentleWrong(el);
    }
  };

  return (
    <div className="question-area">
      <FeedbackLayer burst={fb.burst} toast={fb.toast} />
      <SpeakPrompt text="哪一边更多？点一点更多的那一边" />

      <div className="compare-stage">
        <div
          className={`compare-side ${
            flashedSide === "left" ? "correct-flash" : ""
          }`}
          onClick={(e) => pickSide("left", e.currentTarget)}
        >
          {Array.from({ length: q.left }, (_, i) => (
            <span key={i} className="obj">
              {q.emoji}
            </span>
          ))}
        </div>
        <div
          className={`compare-side ${
            flashedSide === "right" ? "correct-flash" : ""
          }`}
          onClick={(e) => pickSide("right", e.currentTarget)}
        >
          {Array.from({ length: q.right }, (_, i) => (
            <span key={i} className="obj">
              {q.emoji}
            </span>
          ))}
        </div>
      </div>

      <div className="hint">
        第 {idx + 1} / {total} 题 · 一次答对 {correct} 题
      </div>
    </div>
  );
}
