import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PinPad from "../components/PinPad";
import DailyReport from "../components/DailyReport";
import { api } from "../lib/api";
import {
  ACHIEVEMENTS,
  GAMES,
  WIP_GAMES,
  ageFromBirthday,
  effectiveLevel,
} from "../lib/gameConfig";
import { AVATARS } from "../lib/items";
import { useStore } from "../store/useStore";
import type { GameRecord, GameType, SettingsView } from "../types";

export default function Parent() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [pinSession, setPinSession] = useState("");

  return (
    <div className="parent-wrap">
      <div className="topbar" style={{ maxWidth: 1100, margin: "0 auto 18px" }}>
        <button className="icon-btn" onClick={() => navigate("/")}>
          ← 返回
        </button>
        <h1 className="section-title" style={{ margin: 0 }}>
          👪 家长面板
        </h1>
        <div className="spacer" />
        {authed && (
          <button className="icon-btn" onClick={() => setAuthed(false)}>
            🔒 锁定
          </button>
        )}
      </div>

      {!authed ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 30,
          }}
        >
          <PinPad
            onSuccess={(p) => {
              setPinSession(p);
              setAuthed(true);
            }}
          />
        </div>
      ) : (
        <Panel pin={pinSession} setPin={setPinSession} />
      )}
    </div>
  );
}

function Panel({
  pin,
  setPin,
}: {
  pin: string;
  setPin: (p: string) => void;
}) {
  const profiles = useStore((s) => s.profiles);
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [limit, setLimit] = useState(25);
  const [pinMsg, setPinMsg] = useState("");

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      setLimit(s.daily_limit_minutes);
    });
  }, []);

  const saveLimit = async () => {
    try {
      await api.setDailyLimit(limit, pin);
      setSettings((s) => (s ? { ...s, daily_limit_minutes: limit } : s));
      setPinMsg("每日游玩时长已保存 ✅");
      window.setTimeout(() => setPinMsg(""), 2000);
    } catch (e) {
      setPinMsg(String(e));
      window.setTimeout(() => setPinMsg(""), 3000);
    }
  };

  return (
    <div className="parent-grid">
      {/* 今日报告：一键导出 Markdown */}
      <DailyReport profiles={profiles} />

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* PIN 修改 */}
        <div className="card">
          <h3 className="section-title">🔑 修改 PIN</h3>
          {settings?.pin_is_default && (
            <div
              className="hint"
              style={{
                background: "#fef3c7",
                borderRadius: 14,
                padding: "8px 12px",
                color: "#92400e",
                marginBottom: 10,
              }}
            >
              当前还是默认 PIN 0000，建议尽快修改。
            </div>
          )}
          <ChangePinForm
            onChanged={(newPin) => {
              setPin(newPin);
              setSettings((s) => (s ? { ...s, pin_is_default: false } : s));
            }}
          />
        </div>

        {/* 每日时长 */}
        <div className="card">
          <h3 className="section-title">⏰ 每日游玩时长</h3>
          <div className="range-row">
            <span className="hint">10 分钟</span>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
            <span className="hint">60 分钟</span>
          </div>
          <div style={{ textAlign: "center", margin: "10px 0" }}>
            <span className="range-val">{limit} 分钟 / 天</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <button className="btn blue" onClick={() => void saveLimit()}>
              保存时长
            </button>
          </div>
          <div className="hint" style={{ textAlign: "center", marginTop: 8 }}>
            到时间会温和地提醒休息，并自动保存进度。
          </div>
          {pinMsg && (
            <div
              className="hint"
              style={{
                textAlign: "center",
                color: pinMsg.includes("错误") || pinMsg.includes("失败")
                  ? "#b91c1c"
                  : "#15803d",
              }}
            >
              {pinMsg}
            </div>
          )}
        </div>
      </div>

      {/* 每个孩子的统计 */}
      <div className="child-list">
        {profiles.length === 0 && (
          <div className="card">
            <p className="hint">还没有创建儿童档案，先回到首页新建一个小玩家吧。</p>
          </div>
        )}
        {profiles.map((p) => (
          <ChildCard key={p.id} profileId={p.id} pin={pin} />
        ))}
      </div>
    </div>
  );
}

function ChangePinForm({ onChanged }: { onChanged: (newPin: string) => void }) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    if (!/^\d{4}$/.test(oldPin) || !/^\d{4}$/.test(newPin)) {
      setMsg({ ok: false, text: "PIN 需要是 4 位数字" });
      return;
    }
    const ok = await api.changePin(oldPin, newPin);
    if (ok) {
      setMsg({ ok: true, text: "PIN 修改成功" });
      setOldPin("");
      setNewPin("");
      onChanged(newPin);
    } else {
      setMsg({ ok: false, text: "原 PIN 不对，再试一次" });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        className="pin-input"
        type="password"
        inputMode="numeric"
        maxLength={4}
        placeholder="原 PIN"
        value={oldPin}
        onChange={(e) => setOldPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        style={inputStyle}
      />
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        placeholder="新 PIN（4 位数字）"
        value={newPin}
        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        style={inputStyle}
      />
      <button className="btn green" onClick={() => void submit()}>
        修改 PIN
      </button>
      {msg && (
        <div className="hint" style={{ color: msg.ok ? "#15803d" : "#b91c1c", textAlign: "center" }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  minHeight: 56,
  fontSize: 24,
  border: "3px solid #cbd5e1",
  borderRadius: 18,
  padding: "6px 16px",
  fontFamily: "inherit",
};

function ChildCard({ profileId, pin }: { profileId: number; pin: string }) {
  const profiles = useStore((s) => s.profiles);
  const profile = profiles.find((p) => p.id === profileId)!;
  const setLevelOverride = useStore((s) => s.setLevelOverride);
  const deleteProfile = useStore((s) => s.deleteProfile);
  const resetProgress = useStore((s) => s.resetProgress);
  const [stats, setStats] = useState<import("../types").GameStats | null>(null);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [achievements, setAchievements] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<"reset" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState("");

  const avatar = AVATARS.find((a) => a.id === profile.avatar);
  const autoLevel = useMemo(
    () => Math.max(1, Math.min(5, ageFromBirthday(profile.birthday) - 2)),
    [profile.birthday]
  );
  const level = effectiveLevel(profile);

  const load = useCallback(async () => {
    const [st, recs, ach] = await Promise.all([
      api.getStats(profileId),
      api.listRecords(profileId, 100),
      api.listAchievements(profileId),
    ]);
    setStats(st);
    setRecords(recs);
    setAchievements(new Set(ach.map((a) => a.code)));
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  // 各游戏最近最佳正确率与回合数
  const perGame = useMemo(() => {
    const m = new Map<GameType, { rounds: number; best: number; level: number }>();
    for (const r of records) {
      const cur = m.get(r.game_type) ?? { rounds: 0, best: 0, level: r.level };
      cur.rounds += 1;
      cur.best = Math.max(cur.best, Math.round(r.accuracy * 100));
      cur.level = r.level;
      m.set(r.game_type, cur);
    }
    return m;
  }, [records]);

  const adjustLevel = async (delta: number) => {
    const next = Math.max(1, Math.min(5, level + delta));
    await setLevelOverride(profileId, next);
  };

  const doReset = async () => {
    setBusy(true);
    setOpError("");
    try {
      await resetProgress(profileId, pin);
      await load();
      setConfirming(null);
    } catch (e) {
      setOpError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    setOpError("");
    try {
      await deleteProfile(profileId, pin);
      setConfirming(null);
    } catch (e) {
      setOpError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const overall =
    stats && stats.total_answered > 0
      ? Math.round((stats.total_correct / stats.total_answered) * 100)
      : null;

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 56 }}>{avatar?.emoji ?? "🧒"}</span>
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>
            {profile.nickname}
          </h3>
          <div className="hint">
            {ageFromBirthday(profile.birthday)} 岁 · ⭐ {profile.stars_total} ·
            总正确率 {overall == null ? "暂无记录" : `${overall}%`} · 回合 {stats?.rounds ?? 0}
          </div>
        </div>
        <div className="spacer" />
        <div className="level-stepper">
          <span className="hint">难度</span>
          <button onClick={() => void adjustLevel(-1)} aria-label="降低难度">
            −
          </button>
          <strong style={{ fontSize: 28, minWidth: 90, textAlign: "center" }}>
            Level {level}
          </strong>
          <button onClick={() => void adjustLevel(1)} aria-label="提高难度">
            ＋
          </button>
        </div>
        {profile.level_override != null && (
          <button
            className="icon-btn"
            onClick={() => void setLevelOverride(profileId, null)}
          >
            恢复按年龄（Lv.{autoLevel}）
          </button>
        )}
      </div>

      <table className="stat-table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>游戏</th>
            <th>回合数</th>
            <th>最佳正确率</th>
            <th>最近等级</th>
          </tr>
        </thead>
        <tbody>
          {[...GAMES, ...WIP_GAMES].map((g) => {
            const d = perGame.get(g.type);
            return (
              <tr key={g.type}>
                <td>
                  {g.emoji} {g.name}
                  {g.wip ? "（试玩）" : ""}
                </td>
                <td>{d?.rounds ?? 0}</td>
                <td>{d ? `${d.best}%` : "—"}</td>
                <td>{d ? `Lv.${d.level}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 14 }}>
        <div className="section-title">🏅 成就</div>
        <div className="ach-grid">
          {ACHIEVEMENTS.map((a) => {
            const got = achievements.has(a.code);
            return (
              <div key={a.code} className={`ach-chip ${got ? "got" : "dim"}`}>
                <div className="aicon">{a.icon}</div>
                <div className="atitle">{a.title}</div>
                <div className="adesc">{a.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        {!confirming ? (
          <>
            <button className="btn gray" onClick={() => setConfirming("reset")}>
              ♻️ 重置进度
            </button>
            <button className="btn danger" onClick={() => setConfirming("delete")}>
              🗑️ 删除档案
            </button>
          </>
        ) : (
          <>
            <span className="hint" style={{ alignSelf: "center" }}>
              {confirming === "reset"
                ? "确定清空这个孩子的所有星星、记录、成就和饰品吗？"
                : "确定要永久删除这个孩子的档案吗？"}
            </span>
            <button
              className="btn danger"
              disabled={busy}
              onClick={() => (confirming === "reset" ? void doReset() : void doDelete())}
            >
              {busy ? "处理中…" : "确定"}
            </button>
            <button className="btn gray" onClick={() => { setConfirming(null); setOpError(""); }} disabled={busy}>
              取消
            </button>
          </>
        )}
      </div>
      {opError && (
        <div className="hint" style={{ color: "#b91c1c", marginTop: 8 }}>
          {opError}
        </div>
      )}
    </div>
  );
}
