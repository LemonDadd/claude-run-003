import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { AVATARS } from "../lib/items";
import { ageFromBirthday, defaultLevel } from "../lib/gameConfig";
import { playClick } from "../lib/feedback";

function todayMinusYears(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export default function CreateProfile() {
  const navigate = useNavigate();
  const createProfile = useStore((s) => s.createProfile);
  const [nickname, setNickname] = useState("");
  const [birthday, setBirthday] = useState(todayMinusYears(5));
  const [avatar, setAvatar] = useState(AVATARS[0].id);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const name = nickname.trim();
    if (!name) {
      setError("先给小朋友起个名字吧");
      return;
    }
    const age = ageFromBirthday(birthday);
    if (age < 2 || age > 10) {
      setError("生日好像不太对，适合 2–10 岁的小朋友哦");
      return;
    }
    setBusy(true);
    try {
      const p = await createProfile({ nickname: name, birthday, avatar });
      await useStore.getState().selectProfile(p.id);
      navigate("/home");
    } catch (e) {
      setError(`保存失败：${String(e)}`);
      setBusy(false);
    }
  };

  const previewAge = ageFromBirthday(birthday);

  return (
    <div className="form-page">
      <div className="card form-card">
        <h2>新建小玩家</h2>

        <div className="field">
          <label>选一个头像</label>
          <div className="avatar-picker">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`avatar-choice ${avatar === a.id ? "sel" : ""}`}
                onClick={() => {
                  playClick();
                  setAvatar(a.id);
                }}
                aria-label={a.name}
              >
                {a.emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>昵称</label>
          <input
            type="text"
            value={nickname}
            maxLength={12}
            placeholder="例如：小橙子"
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="field">
          <label>生日（年龄会自动计算）</label>
          <input
            type="date"
            value={birthday}
            max={todayMinusYears(1)}
            min={todayMinusYears(10)}
            onChange={(e) => setBirthday(e.target.value)}
          />
          <div className="hint" style={{ marginTop: 8 }}>
            {previewAge >= 2 && previewAge <= 10
              ? `${previewAge} 岁 · 推荐难度 Level ${defaultLevel(previewAge)}（家长可调整）`
              : "请选择有效生日"}
          </div>
        </div>

        <div className="error-text">{error}</div>

        <div className="form-actions">
          <button className="btn gray" onClick={() => navigate("/")} disabled={busy}>
            返回
          </button>
          <button className="btn green big" onClick={save} disabled={busy}>
            {busy ? "保存中…" : "开始玩 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
