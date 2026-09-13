// 前端核心规则冒烟测试（纯逻辑，不涉及 Tauri/DOM）
import {
  ageFromBirthday,
  defaultLevel,
  starsForRound,
  shuffle,
  makeRng,
  randInt,
} from "../src/lib/gameConfig.ts";
import { itemsEarnedByStars } from "../src/lib/items.ts";

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`断言失败: ${msg}`);
  passed++;
  console.log("  ✓", msg);
}

// 年龄计算
assert(ageFromBirthday("2020-09-12") === 6, "2020-09-12 出生在 2026-09-12 应为 6 岁（今天生日）");
assert(ageFromBirthday("2020-12-31") === 5, "2020-12-31 出生现在应为 5 岁（生日未到）");

// 默认 Level = max(1, min(5, age-2))
assert(defaultLevel(3) === 1, "3 岁 → Lv1");
assert(defaultLevel(4) === 2, "4 岁 → Lv2");
assert(defaultLevel(7) === 5, "7 岁 → Lv5");
assert(defaultLevel(2) === 1, "2 岁下限 Lv1");
assert(defaultLevel(10) === 5, "10 岁上限 Lv5");

// 星级：>=80% 一星，100% 两星，否则零星
assert(starsForRound(10, 10) === 2, "全对 → 2 星");
assert(starsForRound(8, 10) === 1, "80% → 1 星");
assert(starsForRound(9, 10) === 1, "90% → 1 星");
assert(starsForRound(4, 5) === 1, "4/5=80% → 1 星");
assert(starsForRound(7, 10) === 0, "70% → 0 星");

// 洗牌不丢元素
const arr = [1, 2, 3, 4, 5];
const s = shuffle(arr, makeRng(42));
assert(s.length === 5 && [...s].sort((a, b) => a - b).join() === "1,2,3,4,5", "shuffle 保持元素不变");
assert(arr.join() === "1,2,3,4,5", "shuffle 不修改原数组");

// 确定性随机
const r1 = makeRng(7);
const r2 = makeRng(7);
assert(r1() === r2() && r1() === r2(), "相同种子随机数序列一致");

// randInt 范围
const r = makeRng(1);
let ok = true;
for (let i = 0; i < 1000; i++) {
  const n = randInt(3, 9, r);
  if (n < 3 || n > 9) ok = false;
}
assert(ok, "randInt(3,9) 始终在 [3,9] 内");

// 饰品：每 5 星解锁节奏
assert(itemsEarnedByStars(0).length >= 1, "初始即有饰品（派对帽）");
assert(itemsEarnedByStars(4).length === itemsEarnedByStars(0).length, "4 星不解锁新饰品");
assert(itemsEarnedByStars(5).length === itemsEarnedByStars(0).length + 1, "5 星解锁第 2 件");
assert(itemsEarnedByStars(50).length === itemsEarnedByStars(45).length + 1, "45→50 再解锁一件");

console.log(`\n全部通过：${passed} 项`);
