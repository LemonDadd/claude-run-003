import { useCallback, useRef, useState } from "react";
import { playCorrect, playWrong, speak } from "../lib/feedback";

export interface Feedback {
  good: (el?: HTMLElement | null) => void;
  gentleWrong: (el?: HTMLElement | null) => void;
  burst: Particle[];
  toast: string | null;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  emoji: string;
}

const STAR_EMOJIS = ["⭐", "🌟", "✨", "💫"];

/**
 * 答题反馈：答对绿色高亮 + 星星粒子 + 清脆音效 + TTS「答对啦」；
 * 答错轻微抖动 + 温和音效 + TTS「再试一次」，不出现红叉/失败字样。
 * 反馈同步触发（<500ms 内呈现）。
 */
export function useFeedback(): Feedback {
  const [burst, setBurst] = useState<Particle[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const idRef = useRef(0);

  const good = useCallback((el?: HTMLElement | null) => {
    playCorrect();
    speak("答对啦");
    const rect = el?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const parts: Particle[] = Array.from({ length: 10 }, () => {
      const id = ++idRef.current;
      const ang = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 130;
      return {
        id,
        x: cx,
        y: cy,
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist - 40,
        emoji: STAR_EMOJIS[Math.floor(Math.random() * STAR_EMOJIS.length)],
      };
    });
    setBurst((b) => [...b, ...parts]);
    setToast("答对啦 🎉");
    window.setTimeout(() => setToast(null), 850);
    window.setTimeout(() => {
      setBurst((b) => b.filter((p) => !parts.some((np) => np.id === p.id)));
    }, 950);
  }, []);

  const gentleWrong = useCallback((el?: HTMLElement | null) => {
    playWrong();
    speak("再试一次");
    if (el) {
      el.classList.remove("shake");
      // 强制重放抖动动画
      void el.offsetWidth;
      el.classList.add("shake");
      window.setTimeout(() => el.classList.remove("shake"), 450);
    }
  }, []);

  return { good, gentleWrong, burst, toast };
}

export function FeedbackLayer({ burst, toast }: { burst: Particle[]; toast: string | null }) {
  return (
    <>
      {toast && <div className="feedback-toast">{toast}</div>}
      <div className="particles" aria-hidden>
        {burst.map((p) => (
          <span
            key={p.id}
            className="star-particle"
            style={
              {
                left: p.x,
                top: p.y,
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
              } as React.CSSProperties
            }
          >
            {p.emoji}
          </span>
        ))}
      </div>
    </>
  );
}
