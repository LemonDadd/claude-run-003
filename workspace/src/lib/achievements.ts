/**
 * 成就判定（纯函数，便于测试）。在 Rust 端幂等解锁。
 * 三类：坚持 / 精通 / 探索
 */

export interface AchievementStats {
  /** 已完成回合数（含本次刚保存的记录） */
  rounds: number;
  /** 累计一次答对题数 */
  total_correct: number;
  /** 玩过的游戏种类数（0-6） */
  played_games: number;
}

export interface AchievementRound {
  /** 本回合一次答对题数 */
  correct: number;
  /** 本回合总题数 */
  total: number;
}

export interface AchievementContext {
  stats: AchievementStats;
  round: AchievementRound;
  /** 最近游玩日期（本地 'YYYY-MM-DD'） */
  playDates: string[];
  /** 当前已解锁饰品数 */
  unlockedItemCount: number;
}

export function evaluateAchievements(ctx: AchievementContext): Set<string> {
  const { stats, round, playDates, unlockedItemCount } = ctx;
  const codes = new Set<string>();

  // 坚持类
  codes.add("first_round");
  if (stats.rounds >= 10) codes.add("rounds_10");
  if (hasThreeDayStreak(playDates)) codes.add("streak_3days");

  // 精通类
  if (round.correct === round.total) codes.add("perfect_game");
  if (stats.total_correct >= 50) codes.add("correct_50");

  // 探索类
  if (stats.played_games >= 6) codes.add("all_games");
  if (unlockedItemCount >= 5) codes.add("items_5");

  return codes;
}

/** 判断日期集合中是否存在连续 3 天（结束于今天或前两天内，按本地日期） */
export function hasThreeDayStreak(days: string[]): boolean {
  if (days.length < 3) return false;
  const set = new Set(days);
  const localDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  const today = new Date();
  // 允许 streak 结束于今天、昨天或前天（跨天临界点宽容）
  for (let offset = 0; offset <= 2; offset++) {
    let ok = true;
    for (let back = 0; back < 3; back++) {
      const d = new Date(today);
      d.setDate(d.getDate() - offset - back);
      if (!set.has(localDate(d))) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}
