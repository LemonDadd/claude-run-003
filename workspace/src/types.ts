export type GameType =
  | "fishing"
  | "compare"
  | "orchard"
  | "shapes"
  | "patterns"
  | "clock"
  | "multiply";

export interface Profile {
  id: number;
  nickname: string;
  birthday: string; // YYYY-MM-DD
  avatar: string;
  level_override: number | null;
  stars_total: number;
  created_at: string;
  outfit_hat?: string | null;
  outfit_glasses?: string | null;
  outfit_background?: string | null;
  outfit_pet?: string | null;
}

export interface GameRecord {
  id: number;
  profile_id: number;
  game_type: GameType;
  level: number;
  correct: number;
  total: number;
  accuracy: number;
  stars_earned: number;
  played_at: string;
}

export interface AchievementDef {
  code: string;
  title: string;
  desc: string;
  category: "persist" | "master" | "explore";
  icon: string;
}

export interface GameStats {
  rounds: number;
  total_correct: number;
  total_answered: number;
  played_games: number;
}

export interface ItemState {
  unlocked: { id: number; item_code: string; unlocked_at: string }[];
  outfit: {
    hat: string | null;
    glasses: string | null;
    background: string | null;
    pet: string | null;
  };
}

export interface SettingsView {
  daily_limit_minutes: number;
  pin_is_default: boolean;
}

export interface DailyReportRow {
  game_type: GameType;
  rounds: number;
  correct: number;
  total: number;
  stars: number;
}

/** 一回合结算载荷（路由 state / 本地缓存） */
export interface RoundResult {
  gameType: GameType;
  level: number;
  correct: number;
  total: number;
  stars: number;
  points: number;
}
