import { ReactNode, useEffect } from "react";
import { speak } from "../lib/feedback";

/** 题干 + 朗读按钮；mount 时自动用中文 TTS 读题，无语音则静默 */
export default function SpeakPrompt({
  text,
  auto = true,
  children,
}: {
  text: string;
  auto?: boolean;
  children?: ReactNode;
}) {
  useEffect(() => {
    if (auto) {
      const t = window.setTimeout(() => speak(text), 250);
      return () => window.clearTimeout(t);
    }
  }, [text, auto]);

  return (
    <div className="prompt">
      {children ?? text}
      <button
        className="speak-btn"
        aria-label="再听一遍"
        onClick={() => speak(text)}
      >
        🔊
      </button>
    </div>
  );
}
