import { AVATARS, ITEM_CATALOG } from "../lib/items";

export interface OutfitSlots {
  hat: string | null;
  glasses: string | null;
  background: string | null;
  pet: string | null;
}

function itemEmoji(code: string | null | undefined): string | null {
  if (!code) return null;
  return ITEM_CATALOG.find((i) => i.code === code)?.emoji ?? null;
}

/** 由头像 + 四个饰品槽位实时合成的卡通头像（首页与装扮预览共用） */
export default function OutfitAvatar({
  avatarId,
  outfit,
  size = 86,
}: {
  avatarId: string;
  outfit: OutfitSlots;
  size?: number;
}) {
  const face = AVATARS.find((a) => a.id === avatarId)?.emoji ?? "🧒";
  const hat = itemEmoji(outfit.hat);
  const glasses = itemEmoji(outfit.glasses);
  const bg = itemEmoji(outfit.background);
  const pet = itemEmoji(outfit.pet);
  const faceSize = Math.round(size * 0.65);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fef3c7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: faceSize,
        flexShrink: 0,
      }}
    >
      {bg && (
        <span
          style={{
            position: "absolute",
            fontSize: size * 0.32,
            right: -size * 0.06,
            bottom: -size * 0.06,
          }}
        >
          {bg}
        </span>
      )}
      <span>{face}</span>
      {hat && (
        <span
          style={{
            position: "absolute",
            fontSize: size * 0.34,
            top: -size * 0.14,
          }}
        >
          {hat}
        </span>
      )}
      {glasses && (
        <span
          style={{
            position: "absolute",
            fontSize: size * 0.26,
            top: "34%",
          }}
        >
          {glasses}
        </span>
      )}
      {pet && (
        <span
          style={{
            position: "absolute",
            fontSize: size * 0.34,
            left: -size * 0.18,
            bottom: -size * 0.04,
          }}
        >
          {pet}
        </span>
      )}
    </div>
  );
}
