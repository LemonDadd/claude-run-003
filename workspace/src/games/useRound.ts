import { useCallback, useRef, useState } from "react";

/**
 * 统一回合流程：
 * - submit(true)  判定答对（本轮首次就答对计 firstTryCorrect），短暂展示反馈后进入下一题
 * - submit(false) 答错：不惩罚，可继续重试
 * 全部题完成后回调 onDone(firstTryCorrect, total)
 */
export function useRound<T>(
  questions: T[],
  onDone: (firstTryCorrect: number, total: number) => void
) {
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  const idxRef = useRef(0);
  const attemptsRef = useRef(0);
  const lockedRef = useRef(false);
  const correctRef = useRef(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const total = questions.length;

  const submit = useCallback(
    (ok: boolean): "right" | "retry" | "locked" => {
      if (lockedRef.current) return "locked";
      if (!ok) {
        attemptsRef.current += 1;
        setAttempts(attemptsRef.current);
        return "retry";
      }
      if (attemptsRef.current === 0) {
        correctRef.current += 1;
        setCorrect(correctRef.current);
      }
      lockedRef.current = true;
      setLocked(true);
      window.setTimeout(() => {
        attemptsRef.current = 0;
        setAttempts(0);
        lockedRef.current = false;
        setLocked(false);
        if (idxRef.current >= total - 1) {
          onDoneRef.current(correctRef.current, total);
        } else {
          idxRef.current += 1;
          setIdx(idxRef.current);
        }
      }, 780);
      return "right";
    },
    [total]
  );

  return { idx, correct, attempts, locked, submit, total };
}
