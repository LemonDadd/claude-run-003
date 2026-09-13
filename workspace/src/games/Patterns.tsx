import { useEffect, useMemo, useState } from "react";
import { DragPiece, DropSlot } from "../components/DragnDrop";
import { FeedbackLayer, useFeedback } from "../components/Feedback";
import SpeakPrompt from "../components/SpeakPrompt";
import { ShapeKind, ShapeSvg, SHAPE_COLORS } from "../components/Shapes";
import { QUESTION_COUNT, makeRng, shuffle } from "../lib/gameConfig";
import { useRound } from "./useRound";

type Key = "A" | "B" | "C";
type Unit = Key[];

interface PatternQ {
  seq: Key[];
  blanks: number[];
  palette: Record<Key, string>;
  shapeFor: Record<Key, ShapeKind>;
  choices: Key[];
}

const SHAPE_POOL: ShapeKind[] = ["circle", "square", "triangle", "star", "heart", "diamond"];
const KEYS: Key[] = ["A", "B", "C"];

function levelUnit(level: number, rng: () => number): Unit {
  if (level <= 2) return ["A", "B"]; // ABAB
  if (level === 3) return rng() > 0.5 ? ["A", "A", "B"] : ["A", "B", "B"];
  if (level === 4) return ["A", "B", "C"]; // ABC
  return rng() > 0.5 ? ["A", "B", "C"] : ["A", "A", "B", "C"]; // ABC / AABC
}

export function buildQuestions(level: number): PatternQ[] {
  const rng = makeRng();
  return Array.from({ length: QUESTION_COUNT[level] ?? 6 }, () => {
    const unit = levelUnit(level, rng);
    const repeats = level <= 2 ? 4 : 3;
    const seq: Key[] = Array.from(
      { length: unit.length * repeats },
      (_, i) => unit[i % unit.length]
    );
    const blankCount = level <= 2 ? 2 : 3;
    // 在最后一个规律单元中，每种图形最多取一个位置作为空格，
    // 保证拖拽区每种答案块只需一个
    const tailStart = seq.length - unit.length;
    const tailSlots = unit.map((k, i) => ({ pos: tailStart + i, key: k }));
    const chosenKeys = new Set<Key>();
    const blanks = shuffle(tailSlots, rng)
      .filter((s) => {
        if (chosenKeys.has(s.key)) return false;
        chosenKeys.add(s.key);
        return true;
      })
      .slice(0, blankCount)
      .map((s) => s.pos)
      .sort((a, b) => a - b);

    const shapes = shuffle(SHAPE_POOL, rng);
    const colors = shuffle(SHAPE_COLORS, rng);
    const shapeFor = {
      A: shapes[0],
      B: shapes[1 % shapes.length],
      C: shapes[2 % shapes.length],
    } as Record<Key, ShapeKind>;
    const palette = {
      A: colors[0].value,
      B: colors[1 % colors.length].value,
      C: colors[2 % colors.length].value,
    } as Record<Key, string>;

    // 选项必须包含所有空格所需答案，再补足 A/B/C
    const choicesSet = new Set(blanks.map((b) => seq[b]));
    KEYS.forEach((k) => choicesSet.add(k));
    const choices = shuffle([...choicesSet], rng);

    return { seq, blanks, palette, shapeFor, choices };
  });
}

export default function Patterns({
  level,
  onDone,
  onProgress,
}: {
  level: number;
  onDone: (c: number, t: number) => void;
  onProgress?: (p: import("./useRound").RoundProgress) => void;
}) {
  const questions = useMemo(() => buildQuestions(level), [level]);
  const { idx, correct, submit, total } = useRound(questions, onDone, onProgress);
  const q = questions[idx];
  const fb = useFeedback();
  const [filled, setFilled] = useState<Record<number, Key>>({});

  // 切题时清空补全状态
  useEffect(() => {
    setFilled({});
  }, [idx]);

  const onDragEnd = (key: Key, slotId: string | null) => {
    if (!slotId || !slotId.startsWith("blank-")) return;
    const blankPos = Number(slotId.slice(6));
    if (filled[blankPos]) {
      fb.gentleWrong(document.querySelector(`[data-drop-slot="${slotId}"]`) as HTMLElement | null);
      return;
    }
    if (q.seq[blankPos] === key) {
      const next = { ...filled, [blankPos]: key };
      setFilled(next);
      fb.good(document.querySelector(`[data-drop-slot="${slotId}"]`) as HTMLElement | null);
      if (q.blanks.every((b) => next[b] != null)) {
        submit(true);
      }
    } else {
      submit(false);
      fb.gentleWrong(document.querySelector(`[data-drag-payload="${key}-piece"]`) as HTMLElement | null);
    }
  };

  return (
    <div className="question-area">
      <FeedbackLayer burst={fb.burst} toast={fb.toast} />
      <SpeakPrompt text="找一找规律，把图形拖到空格里补一补" />

      <div className="dnd-row" style={{ maxWidth: 860 }}>
        {q.seq.map((key, i) => {
          const isBlank = q.blanks.includes(i);
          const filledKey = filled[i];
          if (isBlank) {
            return (
              <DropSlot key={i} id={`blank-${i}`} filled={!!filledKey}>
                {filledKey ? (
                  <ShapeSvg kind={q.shapeFor[filledKey]} color={q.palette[filledKey]} />
                ) : (
                  <span style={{ fontSize: 40, color: "#94a3b8" }}>?</span>
                )}
              </DropSlot>
            );
          }
          return (
            <div key={i} className="drag-piece locked">
              <ShapeSvg kind={q.shapeFor[key]} color={q.palette[key]} />
            </div>
          );
        })}
      </div>

      <div className="hint">👇 接下来应该放谁呢 👇</div>

      <div className="dnd-row">
        {q.choices.map((key) =>
          Object.values(filled).includes(key) ? (
            <div key={key} className="drag-piece" style={{ visibility: "hidden" }} />
          ) : (
            <DragPiece
              key={key}
              payload={`${key}-piece`}
              onDragEnd={(slot) => onDragEnd(key, slot)}
            >
              <ShapeSvg kind={q.shapeFor[key]} color={q.palette[key]} />
            </DragPiece>
          )
        )}
      </div>

      <div className="hint">
        第 {idx + 1} / {total} 题 · 一次答对 {correct} 题
      </div>
    </div>
  );
}
