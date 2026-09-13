/** 固定头像与饰品图鉴。饰品按累计星星每满 5 颗解锁一个（首个默认解锁） */

export const AVATARS = [
  { id: "cat", name: "小猫咪", emoji: "🐱" },
  { id: "bear", name: "小熊", emoji: "🐻" },
  { id: "rabbit", name: "小兔子", emoji: "🐰" },
  { id: "panda", name: "熊猫", emoji: "🐼" },
  { id: "fox", name: "小狐狸", emoji: "🦊" },
  { id: "frog", name: "小青蛙", emoji: "🐸" },
];

export type SlotKey = "hat" | "glasses" | "background" | "pet";

export interface ItemDef {
  code: string;
  slot: SlotKey;
  name: string;
  emoji: string;
  /** 解锁所需累计星星（每 5 颗一个） */
  starsRequired: number;
}

export const ITEM_CATALOG: ItemDef[] = [
  { code: "party_hat", slot: "hat", name: "派对帽", emoji: "🎩", starsRequired: 0 },
  { code: "crown", slot: "hat", name: "小皇冠", emoji: "👑", starsRequired: 5 },
  { code: "cap", slot: "hat", name: "棒球帽", emoji: "🧢", starsRequired: 10 },
  { code: "round_glasses", slot: "glasses", name: "圆眼镜", emoji: "👓", starsRequired: 15 },
  { code: "sunglasses", slot: "glasses", name: "酷酷墨镜", emoji: "🕶️", starsRequired: 20 },
  { code: "bg_sky", slot: "background", name: "蓝蓝天空", emoji: "🌤️", starsRequired: 25 },
  { code: "bg_rainbow", slot: "background", name: "彩虹背景", emoji: "🌈", starsRequired: 30 },
  { code: "bg_space", slot: "background", name: "星空漫游", emoji: "🌌", starsRequired: 35 },
  { code: "pet_dog", slot: "pet", name: "小狗狗", emoji: "🐶", starsRequired: 40 },
  { code: "pet_dino", slot: "pet", name: "小恐龙", emoji: "🦕", starsRequired: 45 },
  { code: "pet_unicorn", slot: "pet", name: "独角兽", emoji: "🦄", starsRequired: 50 },
  { code: "wizard_hat", slot: "hat", name: "魔法帽", emoji: "🎓", starsRequired: 55 },
];

export function itemsEarnedByStars(stars: number): ItemDef[] {
  return ITEM_CATALOG.filter((it) => stars >= it.starsRequired);
}

export const SLOT_LABEL: Record<SlotKey, string> = {
  hat: "帽子",
  glasses: "眼镜",
  background: "背景",
  pet: "小伙伴",
};
