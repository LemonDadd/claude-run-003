import type { AchievementDef, GameType, Profile } from "../types";

export const GAMES: {
  type: GameType;
  name: string;
  emoji: string;
  color: string;
  desc: string;
  /** 占位中的游戏（乘除法先行版），不计入「玩遍六种游戏」成就 */
  wip?: boolean;
  /** 该游戏支持的最高难度（占位游戏只有 3 级） */
  maxLevel?: number;
}[] = [
  {
    type: "fishing",
    name: "数数捕鱼",
    emoji: "🐟",
    color: "#38bdf8",
    desc: "数一数捕到几条鱼",
  },
  {
    type: "compare",
    name: "比较大小",
    emoji: "🍎",
    color: "#fb7185",
    desc: "选出更多的一边",
  },
  {
    type: "orchard",
    name: "加减法果园",
    emoji: "🍊",
    color: "#f59e0b",
    desc: "果园里的加减小问题",
  },
  {
    type: "shapes",
    name: "图形配对",
    emoji: "🔷",
    color: "#818cf8",
    desc: "把图形送回自己的家",
  },
  {
    type: "patterns",
    name: "规律排序",
    emoji: "🌟",
    color: "#34d399",
    desc: "找规律，补一补",
  },
  {
    type: "clock",
    name: "认时钟",
    emoji: "🕐",
    color: "#a78bfa",
    desc: "看看现在几点啦",
  },
];

/** 占位中的游戏：乘除法先行版（平均分），只有 3 个难度，不计入六种主游戏 */
export const WIP_GAMES: (typeof GAMES)[number][] = [
  {
    type: "multiply",
    name: "乘除法·分苹果",
    emoji: "🍎",
    color: "#f472b6",
    desc: "把苹果平均分一分（试玩版）",
    wip: true,
    maxLevel: 3,
  },
];

/** 真正"即将推出"、尚不可玩的内容 */
export const COMING_SOON = ["➗ 分数", "💰 货币认知", "🔢 数独"];

export const ACHIEVEMENTS: AchievementDef[] = [
  // 坚持类
  { code: "first_round", title: "初次冒险", desc: "第一次完成一个游戏", category: "persist", icon: "🌱" },
  { code: "rounds_10", title: "小小坚持家", desc: "累计完成 10 个回合", category: "persist", icon: "🔥" },
  { code: "streak_3days", title: "连续三天", desc: "连续 3 天都来玩", category: "persist", icon: "📅" },
  // 精通类
  { code: "perfect_game", title: "百发百中", desc: "一个游戏全部一次答对", category: "master", icon: "💯" },
  { code: "correct_50", title: "答题达人", desc: "累计答对 50 道题", category: "master", icon: "🏅" },
  // 探索类
  { code: "all_games", title: "小小探险家", desc: "玩遍六种游戏", category: "explore", icon: "🧭" },
  { code: "items_5", title: "收藏家", desc: "解锁 5 个饰品", category: "explore", icon: "🎁" },
];

/** 每个 Level 每回合题数：5–10 题 */
export const QUESTION_COUNT: Record<number, number> = {
  1: 5,
  2: 6,
  3: 7,
  4: 8,
  5: 10,
};

/** 年龄 → 默认难度：max(1, min(5, age-2)) */
export function ageFromBirthday(birthday: string): number {
  const birth = new Date(birthday + "T00:00:00");
  if (Number.isNaN(birth.getTime())) return 3;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return Math.max(0, age);
}

export function defaultLevel(age: number): number {
  return Math.max(1, Math.min(5, age - 2));
}

export function effectiveLevel(profile: Profile): number {
  if (profile.level_override != null) return profile.level_override;
  return defaultLevel(ageFromBirthday(profile.birthday));
}

/** 单回合星级：正确率 ≥80% 一颗，100% 两颗 */
export function starsForRound(correct: number, total: number): 0 | 1 | 2 {
  const acc = correct / Math.max(1, total);
  if (acc >= 0.999) return 2;
  if (acc >= 0.8) return 1;
  return 0;
}

/** 可复现种子随机 */
export function makeRng(seed?: number) {
  let s = seed ?? Math.floor(Math.random() * 2 ** 31);
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randInt(min: number, max: number, rng: () => number = Math.random) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}
