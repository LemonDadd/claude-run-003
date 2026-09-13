// 成就判定纯函数冒烟测试（含收藏家 items_5）
import { evaluateAchievements, hasThreeDayStreak } from "../src/lib/achievements.ts";

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`断言失败: ${msg}`);
  passed++;
  console.log("  ✓", msg);
}

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));

// 首次完成
let codes = evaluateAchievements({
  stats: { rounds: 1, total_correct: 1, played_games: 1 },
  round: { correct: 1, total: 5 },
  playDates: [daysAgo(0)],
  unlockedItemCount: 1,
});
assert(codes.has("first_round"), "首次完成解锁 first_round");
assert(!codes.has("items_5"), "饰品不足 5 个不解锁 items_5");

// 收藏家：解锁 5 个饰品
codes = evaluateAchievements({
  stats: { rounds: 3, total_correct: 10, played_games: 2 },
  round: { correct: 4, total: 5 },
  playDates: [daysAgo(0)],
  unlockedItemCount: 5,
});
assert(codes.has("items_5"), "解锁 5 个饰品 → items_5");
assert(!codes.has("all_games"), "未玩遍 6 种游戏 → 无 all_games");
assert(!codes.has("perfect_game"), "非全对 → 无 perfect_game");

// 4 个饰品仍不解锁，正好卡边界
codes = evaluateAchievements({
  stats: { rounds: 3, total_correct: 10, played_games: 2 },
  round: { correct: 4, total: 5 },
  playDates: [daysAgo(0)],
  unlockedItemCount: 4,
});
assert(!codes.has("items_5"), "仅 4 个饰品不解锁 items_5");

// 精通类
codes = evaluateAchievements({
  stats: { rounds: 1, total_correct: 50, played_games: 1 },
  round: { correct: 6, total: 6 },
  playDates: [daysAgo(0)],
  unlockedItemCount: 1,
});
assert(codes.has("correct_50"), "累计答对 50 题 → correct_50");
assert(codes.has("perfect_game"), "本回合全对 → perfect_game");

// 坚持类
codes = evaluateAchievements({
  stats: { rounds: 10, total_correct: 30, played_games: 3 },
  round: { correct: 5, total: 5 },
  playDates: [daysAgo(0), daysAgo(1), daysAgo(2)],
  unlockedItemCount: 1,
});
assert(codes.has("rounds_10"), "累计 10 回合 → rounds_10");
assert(codes.has("streak_3days"), "连续 3 天 → streak_3days");

// 探索类：玩遍 6 种
codes = evaluateAchievements({
  stats: { rounds: 6, total_correct: 20, played_games: 6 },
  round: { correct: 5, total: 5 },
  playDates: [daysAgo(0)],
  unlockedItemCount: 1,
});
assert(codes.has("all_games"), "玩遍 6 种游戏 → all_games");

// 连续 3 天判定
assert(hasThreeDayStreak([daysAgo(0), daysAgo(1), daysAgo(2)]) === true, "今天/昨天/前天构成连续");
assert(hasThreeDayStreak([daysAgo(0), daysAgo(2), daysAgo(3)]) === false, "有断档不构成连续");
assert(hasThreeDayStreak([daysAgo(1), daysAgo(2), daysAgo(3)]) === true, "昨天结束的连续 3 天也成立");
assert(hasThreeDayStreak([daysAgo(0), daysAgo(1)]) === false, "仅 2 天不构成连续");

console.log(`\n成就判定全部通过：${passed} 项`);
