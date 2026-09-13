import { useEffect, useMemo, useState } from "react";
import { FeedbackLayer, useFeedback } from "../components/Feedback";
import SpeakPrompt from "../components/SpeakPrompt";
import { QUESTION_COUNT, makeRng, randInt, shuffle } from "../lib/gameConfig";
import { playClick } from "../lib/feedback";
import { useRound } from "./useRound";

interface FishQ {
  count: number;
  fish: { emoji: string; top: number; left: number; delay: number; flip: boolean }[];
  choices: number[];
}

const FISH_EMOJIS = ["🐟", "🐠", "🐡", "🦈", "🐙"];

function maxByLevel(level: number) {
  return [3, 5, 9, 12, 20][level - 1] ?? 5;
}

export function buildQuestions(level: number): FishQ[] {
  const rng = makeRng();
  const n = QUESTION_COUNT[level] ?? 6;
  return Array.from({ length: n }, () => {
    const max = maxByLevel(level);
    const count = randInt(1, max, rng);
    // 可选数字范围为 1..max，选项数不能超过范围大小
    const optionCount = Math.min(level <= 2 ? 3 : 4, max);
    const choiceSet = new Set<number>([count]);
    let guard = 0;
    while (choiceSet.size < optionCount && guard++ < 200) {
      const c = count + randInt(-2, 2, rng);
      if (c >= 1 && c <= max) choiceSet.add(c);
    }
    guard = 0;
    while (choiceSet.size < optionCount && guard++ < 200) {
      choiceSet.add(randInt(1, max, rng));
    }
    // 在隐形网格里随机布点，减少鱼之间的重叠
    const cols = 5;
    const rows = 4;
    const cells = shuffle(
      Array.from({ length: cols * rows }, (_, i) => i),
      rng
    ).slice(0, count);
    const fish = cells.map((cell) => {
      const col = cell % cols;
      const row = Math.floor(cell / cols);
      return {
        emoji: FISH_EMOJIS[randInt(0, FISH_EMOJIS.length - 1, rng)],
        top: 6 + row * (82 / rows) + rng() * 6,
        left: 3 + col * (90 / cols) + rng() * 5,
        delay: rng() * 2,
        flip: rng() > 0.5,
      };
    });
    return {
      count,
      fish,
      choices: [...choiceSet].sort((a, b) => a - b),
    };
  });
}

export default function Fishing({
  level,
  onDone,
  onProgress,
}: {
  level: number;
  onDone: (c: number, t: number) => void;
  onProgress?: (p: import("./useRound").RoundProgress) => void;
}) {
  const questions = useMemo(() => buildQuestions(level), [level]);
  const { idx, correct, locked, submit, total } = useRound(questions, onDone, onProgress);
  const q = questions[idx];
  const [caught, setCaught] = useState<boolean[]>(() => q.fish.map(() => false));
  const [caughtCount, setCaughtCount] = useState(0);
  const fb = useFeedback();

  // 切题时重置捕鱼状态
  useEffect(() => {
    setCaught(q.fish.map(() => false));
    setCaughtCount(0);
  }, [q]);

  const catchFish = (i: number) => {
    if (locked || caught[i]) return;
    playClick();
    const next = caught.slice();
    next[i] = true;
    setCaught(next);
    setCaughtCount((c) => c + 1);
  };

  const choose = (n: number, ev: React.MouseEvent<HTMLButtonElement>) => {
    if (locked) return;
    const result = submit(n === q.count);
    if (result === "right") {
      fb.good(ev.currentTarget);
    } else if (result === "retry") {
      fb.gentleWrong(ev.currentTarget);
    }
  };

  return (
    <div className="question-area">
      <FeedbackLayer burst={fb.burst} toast={fb.toast} />
      <SpeakPrompt text="数一数，池塘里一共有几条鱼？" />

      <div className="caught-counter">已捕到 🐟 × {caughtCount}</div>

      <div className="pond" key={idx}>
        {q.fish.map((f, i) => (
          <button
            key={i}
            className={`fish ${caught[i] ? "caught" : ""}`}
            style={{
              top: `${f.top}%`,
              left: `${f.left}%`,
              animationDelay: `${f.delay}s`,
              transform: f.flip ? "scaleX(-1)" : undefined,
            }}
            onClick={() => catchFish(i)}
            aria-label="鱼"
          >
            {f.emoji}
          </button>
        ))}
      </div>

      <div className="answer-row">
        {q.choices.map((c) => (
          <button key={c} className="answer-btn" onClick={(e) => choose(c, e)}>
            {c}
          </button>
        ))}
      </div>

      <div className="hint">
        第 {idx + 1} / {total} 题 · 一次答对 {correct} 题
      </div>
    </div>
  );
}
