import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { ITEM_CATALOG, SLOT_LABEL, SlotKey } from "../lib/items";
import { playClick } from "../lib/feedback";

const SLOTS: SlotKey[] = ["hat", "glasses", "background", "pet"];

export default function Gallery() {
  const navigate = useNavigate();
  const profile = useStore((s) => s.activeProfile);
  const items = useStore((s) => s.items);
  const equip = useStore((s) => s.equip);

  const unlockedSet = useMemo(
    () => new Set(items?.unlocked.map((u) => u.item_code) ?? []),
    [items]
  );

  if (!profile || !items) return null;

  const toggle = (slot: SlotKey, code: string) => {
    playClick();
    void equip(slot, items.outfit[slot] === code ? null : code);
  };

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

      <div className="hint" style={{ marginBottom: 10 }}>
        每累计 5 颗星就能解锁一件新饰品，点一点已解锁的饰品就可以穿上或取下。
      </div>

      <div className="gallery-scroll">
        {SLOTS.flatMap((slot) =>
          ITEM_CATALOG.filter((i) => i.slot === slot).map((item) => {
            const got = unlockedSet.has(item.code);
            const equipped = items.outfit[slot] === item.code;
            return (
              <button
                key={item.code}
                disabled={!got}
                className={`item-card ${equipped ? "equipped" : ""} ${
                  got ? "" : "locked"
                }`}
                onClick={() => toggle(slot, item.code)}
              >
                <div className="iemoji">{got ? item.emoji : "🔒"}</div>
                <div className="iname">{item.name}</div>
                <div className="ineed">
                  {SLOT_LABEL[slot]} ·{" "}
                  {got
                    ? equipped
                      ? "已穿戴，点击取下"
                      : "点击穿戴"
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
