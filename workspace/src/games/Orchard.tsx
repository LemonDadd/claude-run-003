import { useMemo } from "react";
import { FeedbackLayer, useFeedback } from "../components/Feedback";
import SpeakPrompt from "../components/SpeakPrompt";
import { QUESTION_COUNT, makeRng, pick, randInt, shuffle } from "../lib/gameConfig";
import { useRound } from "./useRound";

interface OrchardQ {
  text: string;
  answer: number;
  emoji: string;
  base: number;
  delta: number;
  op: "+" | "-";
  choices: number[];
}

const FRUITS = [
  { emoji: "🍎", name: "苹果" },
  { emoji: "🍊", name: "橘子" },
  { emoji: "🍐", name: "梨" },
  { emoji: "🍑", name: "桃子" },
  { emoji: "🍓", name: "草莓" },
];

function boundsFor(level: number) {
  // 10 以内起步，高 Level 到 20 以内
  switch (level) {
    case 1:
      return { max: 5, ops: ["+"] as ("+" | "-")[] };
    case 2:
      return { max: 10, ops: ["+", "-"] as ("+" | "-")[] };
    case 3:
      return { max: 10, ops: ["+", "-"] as ("+" | "-")[] };
    case 4:
      return { max: 15, ops: ["+", "-"] as ("+" | "-")[] };
    default:
      return { max: 20, ops: ["+", "-"] as ("+" | "-")[] };
  }
}

export function buildQuestions(level: number): OrchardQ[] {
  const rng = makeRng();
  const { max, ops } = boundsFor(level);
  return Array.from({ length: QUESTION_COUNT[level] ?? 6 }, () => {
    const fruit = pick(FRUITS, rng);
    const op = pick(ops, rng);
    let a: number;
    let b: number;
    let answer: number;
    let text: string;
    if (op === "+") {
      a = randInt(1, max - 1, rng);
      b = randInt(1, max - a, rng);
      answer = a + b;
      text = `果树上原来有 ${a} 个${fruit.name}，又长出来 ${b} 个，现在一共有几个${fruit.name}？`;
    } else {
      a = randInt(2, max, rng);
      b = randInt(1, a - 1, rng);
      answer = a - b;
      text = `果树上有 ${a} 个${fruit.name}，小朋友摘走了 ${b} 个，还剩几个${fruit.name}？`;
    }
    const choiceSet = new Set<number>([answer]);
    while (choiceSet.size < 4) {
      const c = answer + randInt(-3, 3, rng);
      if (c >= 0 && c <= max + 2) choiceSet.add(c);
    }
    return {
      text,
      answer,
      emoji: fruit.emoji,
      base: a,
      delta: b,
      op,
      choices: shuffle([...choiceSet], rng),
    };
  });
}

export default function Orchard({
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

  const choose = (n: number, el: HTMLButtonElement) => {
    if (locked) return;
    const result = submit(n === q.answer);
    if (result === "right") fb.good(el);
    else fb.gentleWrong(el);
  };

  // 答对时展示水果变化帮助理解
  const showResult = locked;
  const shownCount = showResult
    ? Math.max(q.base, q.answer)
    : q.base;

  return (
    <div className="question-area">
      <FeedbackLayer burst={fb.burst} toast={fb.toast} />
      <SpeakPrompt text={q.text} />

      <div className="orchard-scene">🌳</div>
      <div className="fruit-line" aria-hidden>
        {Array.from({ length: shownCount }, (_, i) => (
          <span
            key={i}
            className={`f ${
              showResult && q.op === "+" && i >= q.base ? "added" : ""
            } ${showResult && q.op === "-" && i >= q.answer ? "taken" : ""}`}
          >
            {q.emoji}
          </span>
        ))}
      </div>
      {!showResult && (
        <div className="hint">
          {q.op === "+" ? `再加 ${q.delta} 个` : `摘走 ${q.delta} 个`}
        </div>
      )}

      <div className="answer-row">
        {q.choices.map((c) => (
          <button
            key={c}
            className="answer-btn"
            onClick={(e) => choose(c, e.currentTarget)}
          >
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
