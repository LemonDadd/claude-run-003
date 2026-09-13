import { create } from "zustand";
import type {
  AchievementDef,
  GameStats,
  ItemState,
  Profile,
  RoundResult,
} from "../types";
import { api } from "../lib/api";
import { ACHIEVEMENTS, effectiveLevel } from "../lib/gameConfig";
import { itemsEarnedByStars } from "../lib/items";
import { evaluateAchievements } from "../lib/achievements";

interface AppState {
  profiles: Profile[];
  activeProfileId: number | null;
  activeProfile: Profile | null;
  loading: boolean;

  stats: GameStats | null;
  records: import("../types").GameRecord[];
  achievementCodes: Set<string>;
  items: ItemState | null;
  /** 本回合新弹出的成就/饰品，供奖励页展示 */
  lastRound: RoundResult | null;
  newAchievements: AchievementDef[];
  newItems: string[];

  boot: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  selectProfile: (id: number) => Promise<void>;
  createProfile: (input: {
    nickname: string;
    birthday: string;
    avatar: string;
  }) => Promise<Profile>;
  updateProfile: (id: number, input: {
    nickname: string;
    birthday: string;
    avatar: string;
  }) => Promise<void>;
  setLevelOverride: (id: number, level: number | null) => Promise<void>;
  deleteProfile: (id: number, pin: string) => Promise<void>;
  resetProgress: (id: number, pin: string) => Promise<void>;

  /** 游戏结束：保存记录、刷星星、检查成就与饰品 */
  finishRound: (r: RoundResult) => Promise<{ starsTotal: number }>;
  /** 到限/中断：把已作答的部分回合落库（不评星、不进奖励页） */
  savePartialRound: (input: {
    gameType: import("../types").GameType;
    level: number;
    answered: number;
    correct: number;
  }) => Promise<void>;
  refreshProfileData: () => Promise<void>;
  equip: (slot: "hat" | "glasses" | "background" | "pet", code: string | null) => Promise<void>;
}

const ACTIVE_KEY = "kidmath.activeProfile";

function readActiveId(): number | null {
  const v = localStorage.getItem(ACTIVE_KEY);
  return v ? Number(v) : null;
}

export const useStore = create<AppState>((set, get) => ({
  profiles: [],
  activeProfileId: null,
  activeProfile: null,
  loading: true,
  stats: null,
  records: [],
  achievementCodes: new Set(),
  items: null,
  lastRound: null,
  newAchievements: [],
  newItems: [],

  boot: async () => {
    const profiles = await api.listProfiles();
    let activeId = readActiveId();
    if (activeId != null && !profiles.some((p) => p.id === activeId)) {
      activeId = null;
      localStorage.removeItem(ACTIVE_KEY);
    }
    set({ profiles, activeProfileId: activeId, loading: false });
    if (activeId != null) {
      await get().selectProfile(activeId);
    }
  },

  refreshProfiles: async () => {
    const profiles = await api.listProfiles();
    const cur = get().activeProfile;
    set({
      profiles,
      activeProfile: cur ? profiles.find((p) => p.id === cur.id) ?? null : null,
    });
  },

  selectProfile: async (id) => {
    localStorage.setItem(ACTIVE_KEY, String(id));
    const profile = get().profiles.find((p) => p.id === id) ?? null;
    set({ activeProfileId: id, activeProfile: profile });
    await get().refreshProfileData();
  },

  createProfile: async (input) => {
    const p = await api.createProfile(input);
    await get().refreshProfiles();
    return p;
  },

  updateProfile: async (id, input) => {
    await api.updateProfile(id, input);
    await get().refreshProfiles();
    const p = get().profiles.find((x) => x.id === id);
    if (get().activeProfileId === id && p) {
      set({ activeProfile: p });
    }
  },

  setLevelOverride: async (id, level) => {
    await api.setLevelOverride(id, level);
    await get().refreshProfiles();
    const p = get().profiles.find((x) => x.id === id);
    if (get().activeProfileId === id && p) set({ activeProfile: p });
  },

  deleteProfile: async (id, pin) => {
    await api.deleteProfile(id, pin);
    await get().refreshProfiles();
    if (get().activeProfileId === id) {
      localStorage.removeItem(ACTIVE_KEY);
      set({
        activeProfileId: null,
        activeProfile: null,
        stats: null,
        records: [],
        achievementCodes: new Set(),
        items: null,
      });
    }
  },

  resetProgress: async (id, pin) => {
    await api.resetProgress(id, pin);
    await get().refreshProfiles();
    if (get().activeProfileId === id) await get().refreshProfileData();
  },

  refreshProfileData: async () => {
    const { activeProfileId } = get();
    if (activeProfileId == null) return;
    const [stats, records, achievements, items, profiles] = await Promise.all([
      api.getStats(activeProfileId),
      api.listRecords(activeProfileId, 200),
      api.listAchievements(activeProfileId),
      api.listItems(activeProfileId),
      api.listProfiles(),
    ]);
    const profile = profiles.find((p) => p.id === activeProfileId) ?? get().activeProfile;
    set({
      stats,
      records,
      achievementCodes: new Set(achievements.map((a) => a.code)),
      items,
      profiles,
      activeProfile: profile,
    });
  },

  finishRound: async (r) => {
    const profile = get().activeProfile;
    if (!profile) throw new Error("没有活动档案");
    const level = effectiveLevel(profile);

    const saved = await api.saveResult({
      profile_id: profile.id,
      game_type: r.gameType,
      level: r.level ?? level,
      correct: r.correct,
      total: r.total,
      stars_earned: r.stars,
    });

    // 刷新统计
    await get().refreshProfileData();
    const { stats, records, items } = get();

    // ---------- 饰品：按最新总星星同步 ----------
    const starsTotal = saved.stars_total;
    const expected = itemsEarnedByStars(starsTotal).map((i) => i.code);
    const newItemCodes = await api.syncItems(profile.id, expected);
    const already = new Set(items?.unlocked.map((u) => u.item_code) ?? []);
    const brandNew = newItemCodes.filter((c) => !already.has(c));

    // ---------- 成就判定（含解锁 5 个饰品，需在饰品同步之后） ----------
    const unlockedItemCount = (items?.unlocked.length ?? 0) + brandNew.length;
    const codes = evaluateAchievements({
      stats: stats ?? { rounds: 0, total_correct: 0, total_answered: 0, played_games: 0 },
      round: { correct: r.correct, total: r.total },
      playDates: records.slice(0, 30).map((rec) => rec.played_at.slice(0, 10)),
      unlockedItemCount,
    });

    const newlyUnlocked: AchievementDef[] = [];
    for (const code of codes) {
      const isNew = await api.unlockAchievement(profile.id, code);
      if (isNew) {
        const def = ACHIEVEMENTS.find((a) => a.code === code);
        if (def) newlyUnlocked.push(def);
      }
    }

    await get().refreshProfileData();
    set({
      lastRound: r,
      newAchievements: newlyUnlocked,
      newItems: brandNew,
    });
    return { starsTotal };
  },

  savePartialRound: async ({ gameType, level, answered, correct }) => {
    const profile = get().activeProfile;
    if (!profile || answered <= 0) return;
    // 到限中断：记录答题进度供家长查看，但不计星、不触发回合类成就
    await api.saveResult({
      profile_id: profile.id,
      game_type: gameType,
      level,
      correct,
      total: answered,
      stars_earned: 0,
    });
  },

  equip: async (slot, code) => {
    const profile = get().activeProfile;
    if (!profile || !get().items) return;
    const outfit = {
      hat: get().items!.outfit.hat,
      glasses: get().items!.outfit.glasses,
      background: get().items!.outfit.background,
      pet: get().items!.outfit.pet,
      [slot]: code,
    } as ItemState["outfit"];
    await api.setOutfit(profile.id, outfit);
    await get().refreshProfileData();
  },
}));
