import { useEffect, useMemo, useState } from "react";
import { DragPiece, DropSlot } from "../components/DragnDrop";
import { FeedbackLayer, useFeedback } from "../components/Feedback";
import SpeakPrompt from "../components/SpeakPrompt";
import { ShapeKind, ShapeSvg, SHAPE_COLORS, SHAPE_KINDS, SHAPE_NAMES } from "../components/Shapes";
import { QUESTION_COUNT, makeRng, shuffle } from "../lib/gameConfig";
import { useRound } from "./useRound";

interface Piece {
  uid: string;
  kind: ShapeKind;
  color: string;
  colorName?: string;
}

interface ShapeQ {
  /** 是否需要同时匹配形状与颜色 */
  matchColor: boolean;
  slots: Piece[];
  tray: Piece[];
}

function configFor(level: number) {
  switch (level) {
    case 1:
      return { count: 2, color: false, palettes: 1 };
    case 2:
      return { count: 3, color: false, palettes: 1 };
    case 3:
      return { count: 4, color: false, palettes: 2 };
    case 4:
      return { count: 4, color: false, palettes: 3 };
    default:
      return { count: 4, color: true, palettes: 3 };
  }
}

export function buildQuestions(level: number): ShapeQ[] {
  const rng = makeRng();
  const cfg = configFor(level);
  return Array.from({ length: QUESTION_COUNT[level] ?? 6 }, () => {
    const kinds = shuffle(SHAPE_KINDS, rng);
    let slots: Piece[];

    if (cfg.color) {
      // Level 5：出现同形状、不同颜色的目标，必须形状+颜色都匹配
      const baseKind = kinds[0];
      const otherKinds = kinds.slice(1, 4);
      const c1 = SHAPE_COLORS[Math.floor(rng() * SHAPE_COLORS.length)];
      let c2 = SHAPE_COLORS[Math.floor(rng() * SHAPE_COLORS.length)];
      while (c2.id === c1.id) {
        c2 = SHAPE_COLORS[Math.floor(rng() * SHAPE_COLORS.length)];
      }
      slots = [
        { uid: `${baseKind}-${c1.id}-0`, kind: baseKind, color: c1.value, colorName: c1.name },
        { uid: `${baseKind}-${c2.id}-1`, kind: baseKind, color: c2.value, colorName: c2.name },
        ...otherKinds.map((kind, i) => {
          const c = SHAPE_COLORS[(i + 2) % SHAPE_COLORS.length];
          return { uid: `${kind}-${c.id}-${i + 2}`, kind, color: c.value, colorName: c.name };
        }),
      ];
    } else {
      const chosen = kinds.slice(0, cfg.count) as ShapeKind[];
      slots = chosen.map((kind, i) => {
        const c = SHAPE_COLORS[(i + Math.floor(rng() * SHAPE_COLORS.length)) % SHAPE_COLORS.length];
        return {
          uid: `${kind}-${c.id}-${i}`,
          kind,
          color: c.value,
        };
      });
    }
    return { matchColor: cfg.color, slots, tray: shuffle(slots, rng) };
  });
}

export default function ShapesGame({
  level,
  onDone,
}: {
  level: number;
  onDone: (c: number, t: number) => void;
}) {
  const questions = useMemo(() => buildQuestions(level), [level]);
  const { idx, correct, submit, total } = useRound(questions, onDone);
  const q = questions[idx];
  const fb = useFeedback();
  const [placed, setPlaced] = useState<Record<string, string | null>>({});

  // 切题时清空已放置状态
  useEffect(() => {
    setPlaced({});
  }, [idx]);

  const pieceAtSlot = (slotId: string) =>
    q.tray.find((p) => placed[p.uid] === slotId);

  const onDragEnd = (piece: Piece, overSlot: string | null) => {
    if (!overSlot) return; // 未到槽位，DragPiece 自动回弹
    if (pieceAtSlot(overSlot)) {
      // 槽位已被占用：轻提示并回弹
      submit(false);
      fb.gentleWrong(document.querySelector(`[data-drag-payload="${piece.uid}"]`) as HTMLElement | null);
      return;
    }
    const target = q.slots.find((_, i) => `slot-${i}` === overSlot);
    if (!target) return;
    const shapeOk = target.kind === piece.kind;
    const colorOk = !q.matchColor || target.color === piece.color;
    if (shapeOk && colorOk) {
      const next = { ...placed, [piece.uid]: overSlot };
      setPlaced(next);
      fb.good(document.querySelector(`[data-drop-slot="${overSlot}"]`) as HTMLElement | null);
      const done = q.slots.every((_, i) =>
        Object.values(next).includes(`slot-${i}`)
      );
      if (done) {
        submit(true);
      }
    } else {
      submit(false);
      fb.gentleWrong(document.querySelector(`[data-drag-payload="${piece.uid}"]`) as HTMLElement | null);
    }
  };

  const promptText = q.matchColor
    ? "看一看，把一样形状、一样颜色的图形拖回家"
    : "看一看，把一样的图形拖回家";

  return (
    <div className="question-area">
      <FeedbackLayer burst={fb.burst} toast={fb.toast} />
      <SpeakPrompt text={promptText} />

      <div className="dnd-row">
        {q.slots.map((s, i) => {
          const slotId = `slot-${i}`;
          const piece = pieceAtSlot(slotId);
          return (
            <DropSlot
              key={slotId}
              id={slotId}
              filled={!!piece}
            >
              {piece ? (
                <ShapeSvg kind={piece.kind} color={piece.color} />
              ) : (
                <ShapeSvg kind={s.kind} color={s.color} faded size={64} />
              )}
            </DropSlot>
          );
        })}
      </div>

      <div className="hint">👇 从下面拖上去 👇</div>

      <div className="dnd-row">
        {q.tray.map((p) =>
          placed[p.uid] ? (
            <div key={p.uid} className="drag-piece" style={{ visibility: "hidden" }} />
          ) : (
            <DragPiece
              key={p.uid}
              payload={p.uid}
              onDragEnd={(slot) => onDragEnd(p, slot)}
            >
              <ShapeSvg kind={p.kind} color={p.color} />
            </DragPiece>
          )
        )}
      </div>

      <div className="hint">
        {SHAPE_NAMES[q.slots[0]?.kind ?? "circle"]}
        {q.matchColor ? " · 找形状和颜色都一样的位置" : ""} · 第 {idx + 1} / {total} 题 ·
        一次答对 {correct} 题
      </div>
    </div>
  );
}
