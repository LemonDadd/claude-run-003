import { useCallback, useRef, useState } from "react";

export interface RoundProgress {
  /** 当前题目序号（0 基） */
  index: number;
  /** 已作答的题数（含答错重试，每次提交 +1） */
  answered: number;
  /** 一次答对的题数 */
  firstTryCorrect: number;
}

/**
 * 统一回合流程：
 * - submit(true)  判定答对（本轮首次就答对计 firstTryCorrect），短暂展示反馈后进入下一题
 * - submit(false) 答错：不惩罚，可继续重试
 * 全部题完成后回调 onDone(firstTryCorrect, total)
 * onProgress 在每次提交后回调，供到限等中断场景保存部分回合。
 */
export function useRound<T>(
  questions: T[],
  onDone: (firstTryCorrect: number, total: number) => void,
  onProgress?: (p: RoundProgress) => void
) {
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [answered, setAnswered] = useState(0);

  const idxRef = useRef(0);
  const attemptsRef = useRef(0);
  const lockedRef = useRef(false);
  const correctRef = useRef(0);
  const answeredRef = useRef(0);
  /** 当前题是否已计过「已作答」（每题只在首次提交时计一次） */
  const currentTouchedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const onProgressRef = useRef(onProgress);
  onDoneRef.current = onDone;
  onProgressRef.current = onProgress;
  const total = questions.length;

  const emit = () => {
    onProgressRef.current?.({
      index: idxRef.current,
      answered: answeredRef.current,
      firstTryCorrect: correctRef.current,
    });
  };

  const submit = useCallback(
    (ok: boolean): "right" | "retry" | "locked" => {
      if (lockedRef.current) return "locked";
      // 每题首次提交才计入「已作答题数」
      if (!currentTouchedRef.current) {
        currentTouchedRef.current = true;
        answeredRef.current += 1;
        setAnswered(answeredRef.current);
      }
      if (!ok) {
        attemptsRef.current += 1;
        setAttempts(attemptsRef.current);
        emit();
        return "retry";
      }
      if (attemptsRef.current === 0) {
        correctRef.current += 1;
        setCorrect(correctRef.current);
      }
      lockedRef.current = true;
      setLocked(true);
      emit();
      window.setTimeout(() => {
        attemptsRef.current = 0;
        setAttempts(0);
        currentTouchedRef.current = false;
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

  return { idx, correct, attempts, locked, answered, submit, total };
}
