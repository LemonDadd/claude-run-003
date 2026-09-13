import { invoke } from "@tauri-apps/api/core";
import type {
  GameStats,
  GameType,
  ItemState,
  Profile,
  SettingsView,
} from "../types";

/**
 * 所有数据库操作都通过这里的 Tauri command 完成。
 * 前端不直接访问文件系统，应用内无 fetch/axios，无任何网络请求。
 */

export interface ProfileInput {
  nickname: string;
  birthday: string;
  avatar: string;
}

export const api = {
  // 档案
  listProfiles: () => invoke<Profile[]>("list_profiles"),
  createProfile: (input: ProfileInput) =>
    invoke<Profile>("create_profile", { input }),
  updateProfile: (id: number, input: ProfileInput) =>
    invoke<void>("update_profile", { id, input }),
  deleteProfile: (id: number, pin: string) =>
    invoke<void>("delete_profile", { id, pin }),
  resetProgress: (profileId: number, pin: string) =>
    invoke<void>("reset_progress", { profileId, pin }),
  setLevelOverride: (id: number, level: number | null) =>
    invoke<void>("set_level_override", { id, level }),

  // 记录
  saveResult: (input: {
    profile_id: number;
    game_type: GameType;
    level: number;
    correct: number;
    total: number;
    stars_earned: number;
  }) =>
    invoke<{ record_id: number; stars_total: number }>("save_game_result", {
      input,
    }),
  listRecords: (profileId: number, limit = 200) =>
    invoke<import("../types").GameRecord[]>("list_records", {
      profileId,
      limit,
    }),
  getStats: (profileId: number) =>
    invoke<GameStats>("get_stats", { profileId }),

  // 成就
  listAchievements: (profileId: number) =>
    invoke<{ id: number; code: string; unlocked_at: string }[]>(
      "list_achievements",
      { profileId }
    ),
  unlockAchievement: (profileId: number, code: string) =>
    invoke<boolean>("unlock_achievement", { profileId, code }),

  // 饰品
  listItems: (profileId: number) =>
    invoke<ItemState>("list_items", { profileId }),
  syncItems: (profileId: number, itemCodes: string[]) =>
    invoke<string[]>("sync_unlocked_items", {
      input: { profile_id: profileId, item_codes: itemCodes },
    }),
  setOutfit: (
    profileId: number,
    outfit: {
      hat: string | null;
      glasses: string | null;
      background: string | null;
      pet: string | null;
    }
  ) =>
    invoke<void>("set_outfit", {
      input: { profile_id: profileId, ...outfit },
    }),

  // 家长
  getSettings: () => invoke<SettingsView>("get_settings"),
  verifyPin: (pin: string) => invoke<boolean>("verify_pin", { pin }),
  changePin: (oldPin: string, newPin: string) =>
    invoke<boolean>("change_pin", { oldPin, newPin }),
  setDailyLimit: (minutes: number, pin: string) =>
    invoke<void>("set_daily_limit", { minutes, pin }),

  // 时长
  addPlaySeconds: (profileId: number, seconds: number) =>
    invoke<void>("add_play_seconds", { profileId, seconds }),
  getTodayUsage: (profileId: number) =>
    invoke<number>("get_today_usage", { profileId }),

  // 今日报告
  getDailyReport: (profileId: number) =>
    invoke<import("../types").DailyReportRow[]>("get_daily_report", { profileId }),
  exportDailyReport: (profileId: number) =>
    invoke<string>("export_daily_report", { profileId }),
};
