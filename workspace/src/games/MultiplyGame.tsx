import { useMemo } from "react";
import { FeedbackLayer, useFeedback } from "../components/Feedback";
import SpeakPrompt from "../components/SpeakPrompt";
import { QUESTION_COUNT, makeRng, randInt, shuffle } from "../lib/gameConfig";
import { useRound } from "./useRound";

interface DivideQ {
  total: number;
  groups: number;
  answer: number;
  choices: number[];
}

function rangeFor(level: number) {
  // 分苹果：N 个苹果平均分到 M 组
  switch (level) {
    case 1:
      return { maxGroups: 3, maxEach: 4 }; // 最多 12 个
    case 2:
      return { maxGroups: 5, maxEach: 6 }; // 最多 25 个左右
    default:
      return { maxGroups: 6, maxEach: 8 }; // 最多 36 个
  }
}

export function buildQuestions(level: number): DivideQ[] {
  const rng = makeRng();
  const { maxGroups, maxEach } = rangeFor(level);
  return Array.from({ length: QUESTION_COUNT[level] ?? 6 }, () => {
    const groups = randInt(2, maxGroups, rng);
    const each = randInt(level === 1 ? 1 : 2, maxEach, rng);
    const total = groups * each; // 保证能整除
    const answer = each;

    const set = new Set<number>([answer]);
    let guard = 0;
    while (set.size < 4 && guard++ < 200) {
      const d = [answer - 1, answer + 1, answer - 2, answer + 2, answer + groups, answer - groups][
        randInt(0, 5, rng)
      ];
      if (d >= 1) set.add(d);
    }
    while (set.size < 4) set.add(answer + set.size);

    return {
      total,
      groups,
      answer,
      choices: shuffle([...set], rng),
    };
  });
}

export default function MultiplyGame({
  level,
  onDone,
  onProgress,
}: {
  level: number;
  onDone: (c: number, t: number) => void;
  onProgress?: (p: import("./useRound").RoundProgress) => void;
}) {
  // 占位版只有 3 个难度
  const lvl = Math.max(1, Math.min(3, level));
  const questions = useMemo(() => buildQuestions(lvl), [lvl]);
  const { idx, correct, locked, submit, total } = useRound(questions, onDone, onProgress);
  const q = questions[idx];
  const fb = useFeedback();

  const choose = (n: number, el: HTMLButtonElement) => {
    if (locked) return;
    const result = submit(n === q.answer);
    if (result === "right") fb.good(el);
    else fb.gentleWrong(el);
  };

  return (
    <div className="question-area">
      <FeedbackLayer burst={fb.burst} toast={fb.toast} />
      <SpeakPrompt
        text={`把${q.total}个苹果平均分到${q.groups}个篮子里，每个篮子有几个？`}
      >
        把 {q.total} 个苹果平均分到 {q.groups} 个篮子，每个篮子几个？
      </SpeakPrompt>

      {/* 苹果与篮子的直观呈现 */}
      <div
        style={{
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 820,
        }}
      >
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(q.total, 9)}, 34px)`,
              gap: 2,
              justifyContent: "center",
            }}
          >
            {Array.from({ length: q.total }, (_, i) => (
              <span key={i} style={{ fontSize: 28 }}>
                🍎
              </span>
            ))}
          </div>
          <div className="hint" style={{ marginTop: 6 }}>
            一共 {q.total} 个苹果
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 48,
            fontWeight: 900,
            color: "#f472b6",
          }}
        >
          平均分 →
        </div>
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {Array.from({ length: q.groups }, (_, i) => (
              <span key={i} style={{ fontSize: 44 }}>
                🧺
              </span>
            ))}
          </div>
          <div className="hint" style={{ marginTop: 6 }}>
            {q.groups} 个篮子
          </div>
        </div>
      </div>

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
        第 {idx + 1} / {total} 题 · 一次答对 {correct} 题 · 试玩版 Lv.{lvl}
      </div>
    </div>
  );
}
