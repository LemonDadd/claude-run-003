import { useState } from "react";
import { api } from "../lib/api";
import { playWrong } from "../lib/feedback";

/** 4 位数字 PIN 键盘（误码轻微抖动，不显示叉/失败字样） */
export default function PinPad({
  onSuccess,
}: {
  onSuccess: (pin: string) => void | Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);

  const tap = async (k: string) => {
    if (checking) return;
    if (k === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (k === "ok" || pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      setChecking(true);
      const ok = await api.verifyPin(next);
      if (ok) {
        await onSuccess(next);
      } else {
        playWrong();
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
        setPin("");
      }
      setChecking(false);
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", ""];

  return (
    <div className={`card ${shake ? "shake" : ""}`} style={{ width: 380 }}>
      <h2 className="section-title" style={{ textAlign: "center" }}>
        👪 家长验证
      </h2>
      <div className="hint" style={{ textAlign: "center" }}>
        请输入 4 位家长 PIN（初始为 0000）
      </div>
      <div className="pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-dot ${pin.length > i ? "on" : ""}`} />
        ))}
      </div>
      <div className="pin-pad">
        {keys.map((k, i) =>
          k === "" ? (
            <div key={i} />
          ) : (
            <button
              key={k}
              className="pin-key"
              onClick={() => void tap(k)}
              style={k === "del" ? { fontSize: 26 } : undefined}
            >
              {k === "del" ? "⌫" : k}
            </button>
          )
        )}
      </div>
    </div>
  );
}
