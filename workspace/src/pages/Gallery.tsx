import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { api } from "../lib/api";
import { ITEM_CATALOG, SLOT_LABEL, SlotKey } from "../lib/items";
import { playClick } from "../lib/feedback";
import OutfitAvatar, { OutfitSlots } from "../components/OutfitAvatar";

const SLOTS: SlotKey[] = ["hat", "glasses", "background", "pet"];

export default function Gallery() {
  const navigate = useNavigate();
  const profile = useStore((s) => s.activeProfile);
  const items = useStore((s) => s.items);
  const refreshProfileData = useStore((s) => s.refreshProfileData);
  const [busy, setBusy] = useState(false);
  const [savedTip, setSavedTip] = useState(false);

  // 试穿草稿：初始为当前已穿戴，选择饰品只改这里，不落库
  const [draft, setDraft] = useState<OutfitSlots>({
    hat: null,
    glasses: null,
    background: null,
    pet: null,
  });

  const saved: OutfitSlots = useMemo(
    () => ({
      hat: items?.outfit.hat ?? null,
      glasses: items?.outfit.glasses ?? null,
      background: items?.outfit.background ?? null,
      pet: items?.outfit.pet ?? null,
    }),
    [items]
  );

  // 已保存装扮变化时（初次加载/确认后），同步草稿
  useEffect(() => {
    setDraft(saved);
  }, [saved.hat, saved.glasses, saved.background, saved.pet]);

  const unlockedSet = useMemo(
    () => new Set(items?.unlocked.map((u) => u.item_code) ?? []),
    [items]
  );

  if (!profile || !items) return null;

  const dirty =
    draft.hat !== saved.hat ||
    draft.glasses !== saved.glasses ||
    draft.background !== saved.background ||
    draft.pet !== saved.pet;

  const toggle = (slot: SlotKey, code: string) => {
    playClick();
    setDraft((d) => ({ ...d, [slot]: d[slot] === code ? null : code }));
  };

  const confirm = async () => {
    if (!dirty || busy) return;
    setBusy(true);
    try {
      // 逐槽位落库（复用现有 equip command），写完后从后端刷新一次
      await api.setOutfit(profile.id, draft);
      await refreshProfileData();
      setSavedTip(true);
      window.setTimeout(() => setSavedTip(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    playClick();
    setDraft(saved); // 不写库，恢复到已保存装扮
  };

  const equipCount = Object.values(draft).filter(Boolean).length;

  return (
    <div className="page gallery-wrap">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate("/home")}>
          🏠 首页
        </button>
        <h1 className="section-title" style={{ margin: 0 }}>
          🎒 饰品图鉴与装扮
        </h1>
        <div className="spacer" />
        <div className="star-pill">⭐ {profile.stars_total}</div>
      </div>

      {/* 试穿预览 + 确认/取消 */}
      <div className="card tryon-bar">
        <OutfitAvatar avatarId={profile.avatar} outfit={draft} size={104} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <div className="section-title" style={{ margin: 0 }}>
            试穿预览
          </div>
          <div className="hint">
            {equipCount === 0
              ? "点一点下面已解锁的饰品试穿"
              : `当前试穿 ${equipCount} 件${dirty ? "（还没保存）" : "（已是当前装扮）"}`}
          </div>
        </div>
        <div className="tryon-actions">
          <button className="btn green big" disabled={!dirty || busy} onClick={() => void confirm()}>
            {busy ? "保存中…" : "✅ 就穿这一套"}
          </button>
          <button className="btn ghost" disabled={!dirty || busy} onClick={cancel}>
            ↩️ 取消
          </button>
        </div>
        {savedTip && <div className="tryon-tip">装扮已保存！</div>}
      </div>

      <div className="hint" style={{ margin: "10px 2px" }}>
        每累计 5 颗星解锁一件新饰品；点击试穿，满意后点「就穿这一套」保存，取消不会改动。
      </div>

      <div className="gallery-scroll">
        {SLOTS.flatMap((slot) =>
          ITEM_CATALOG.filter((i) => i.slot === slot).map((item) => {
            const got = unlockedSet.has(item.code);
            const tried = draft[slot] === item.code;
            return (
              <button
                key={item.code}
                disabled={!got}
                className={`item-card ${tried ? "equipped" : ""} ${got ? "" : "locked"}`}
                onClick={() => toggle(slot, item.code)}
              >
                <div className="iemoji">{got ? item.emoji : "🔒"}</div>
                <div className="iname">{item.name}</div>
                <div className="ineed">
                  {SLOT_LABEL[slot]} ·{" "}
                  {got
                    ? tried
                      ? "试穿中 ✓（再点取下）"
                      : "点击试穿"
                    : `需 ${item.starsRequired} ⭐`}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
