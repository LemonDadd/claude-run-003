import { useMemo } from "react";
import { FeedbackLayer, useFeedback } from "../components/Feedback";
import SpeakPrompt from "../components/SpeakPrompt";
import { MiniClock, formatTime } from "../components/MiniClock";
import { QUESTION_COUNT, makeRng, randInt, shuffle } from "../lib/gameConfig";
import { useRound } from "./useRound";

interface ClockQ {
  hour: number;
  half: boolean;
  choices: { hour: number; half: boolean }[];
}

function modeFor(level: number): "hour" | "half" | "mix" {
  if (level <= 2) return "hour";
  if (level === 3) return "half";
  return "mix";
}

export function buildQuestions(level: number): ClockQ[] {
  const rng = makeRng();
  const mode = modeFor(level);
  return Array.from({ length: QUESTION_COUNT[level] ?? 6 }, () => {
    const hour = randInt(1, 12, rng);
    const half = mode === "hour" ? false : mode === "half" ? true : rng() > 0.5;
    const optionCount = level >= 4 ? 4 : 3;
    const set = new Set<string>([formatTime(hour, half)]);
    const choices: { hour: number; half: boolean }[] = [{ hour, half }];
    let guard = 0;
    while (choices.length < optionCount && guard++ < 50) {
      const ch = randInt(1, 12, rng);
      const chHalf = rng() > 0.5;
      const key = formatTime(ch, chHalf);
      if (set.has(key)) continue;
      // 整点级别不引入半点干扰，半点级别以半点干扰为主
      if (mode === "hour" && chHalf) continue;
      set.add(key);
      choices.push({ hour: ch, half: chHalf });
    }
    return { hour, half, choices: shuffle(choices, rng) };
  });
}

function timeText(hour: number, half: boolean) {
  return half ? `${hour}点半` : `${hour}点整`;
}

export default function ClockGame({
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

  const choose = (hour: number, half: boolean, el: HTMLButtonElement) => {
    if (locked) return;
    const result = submit(hour === q.hour && half === q.half);
    if (result === "right") fb.good(el);
    else fb.gentleWrong(el);
  };

  return (
    <div className="question-area">
      <FeedbackLayer burst={fb.burst} toast={fb.toast} />
      <SpeakPrompt text={`看一看，这个时钟表示的是几点？`}>
        看一看，时钟上是几点？
      </SpeakPrompt>

      <div
        style={{
          background: "#fff",
          borderRadius: 40,
          padding: 20,
          boxShadow: "0 8px 0 #cbd5e1",
        }}
      >
        <MiniClock hour={q.hour} half={q.half} />
      </div>

      <div className="answer-row">
        {q.choices.map((c) => (
          <button
            key={formatTime(c.hour, c.half)}
            className="answer-btn"
            style={{ minWidth: 150, fontSize: 32 }}
            onClick={(e) => choose(c.hour, c.half, e.currentTarget)}
          >
            {timeText(c.hour, c.half)}
          </button>
        ))}
      </div>

      <div className="hint">
        第 {idx + 1} / {total} 题 · 一次答对 {correct} 题
      </div>
    </div>
  );
}
