// 六个主游戏 + 乘除法占位版的出题器不变量冒烟测试（不渲染组件）
import { buildQuestions as fishQ } from "../src/games/Fishing.tsx";
import { buildQuestions as compareQ } from "../src/games/Compare.tsx";
import { buildQuestions as orchardQ } from "../src/games/Orchard.tsx";
import { buildQuestions as shapesQ } from "../src/games/ShapesGame.tsx";
import { buildQuestions as patternsQ } from "../src/games/Patterns.tsx";
import { buildQuestions as clockQ } from "../src/games/ClockGame.tsx";
import { buildQuestions as multiplyQ } from "../src/games/MultiplyGame.tsx";
import { QUESTION_COUNT, GAMES, WIP_GAMES } from "../src/lib/gameConfig.ts";

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`断言失败: ${msg}`);
  passed++;
}

for (let level = 1; level <= 5; level++) {
  const n = QUESTION_COUNT[level];

  // 数数捕鱼
  const f = fishQ(level);
  assert(f.length === n, `Lv${level} 捕鱼题数=${n}`);
  for (const q of f) {
    assert(q.fish.length === q.count, `Lv${level} 鱼数=${q.count} 与渲染数一致`);
    assert(q.choices.includes(q.count), `Lv${level} 捕鱼选项含正确答案`);
    assert(new Set(q.choices).size === q.choices.length, `Lv${level} 捕鱼选项无重复`);
    assert(q.count >= 1 && q.count <= [3, 5, 9, 12, 20][level - 1], `Lv${level} 鱼数在等级范围内`);
  }

  // 比较大小
  const c = compareQ(level);
  assert(c.length === n, `Lv${level} 比较题数=${n}`);
  for (const q of c) {
    assert(q.left !== q.right, `Lv${level} 两边数量不相等`);
    assert(q.left >= 1 && q.right >= 1, `Lv${level} 数量为正`);
  }

  // 果园
  const o = orchardQ(level);
  assert(o.length === n, `Lv${level} 果园题数=${n}`);
  const maxBound = [10, 10, 15, 20, 20][level - 1];
  let plusCount = 0;
  for (const q of o) {
    if (q.op === "+") plusCount++;
    assert(q.choices.includes(q.answer), `Lv${level} 果园选项含答案`);
    assert(new Set(q.choices).size === 4, `Lv${level} 果园 4 个不同选项`);
    assert(q.answer >= 0, `Lv${level} 果园答案非负`);
    if (q.op === "+") {
      assert(q.base + q.delta <= maxBound, `Lv${level} 加法在 ${maxBound} 以内`);
      if (level === 1) {
        assert(q.base + q.delta <= 10, `Lv1 加法结果在 10 以内`);
        assert(q.base + q.delta >= 2, `Lv1 加法至少为 2`);
      }
      assert(q.base + q.delta === q.answer, `加法答案正确`);
    } else {
      assert(level >= 2, `Lv1 不出减法`);
      assert(q.base - q.delta === q.answer && q.delta < q.base, `减法答案正确且够减`);
    }
    assert(Math.max(q.base, q.answer) <= maxBound, `Lv${level} 果园数字在 ${maxBound} 以内`);
  }
  if (level === 1) {
    assert(plusCount === o.length, `Lv1 果园只出加法`);
    assert(o.every((q) => q.base + q.delta <= 10), `Lv1 加法结果均在 10 以内`);
  }

  // 图形配对
  const s = shapesQ(level);
  assert(s.length === n, `Lv${level} 图形题数=${n}`);
  for (const q of s) {
    assert(q.tray.length === q.slots.length, `Lv${level} 托盘块数=槽位数`);
    const slotKeys = q.slots.map((p) => `${p.kind}|${p.color}`);
    const trayKeys = q.tray.map((p) => `${p.kind}|${p.color}`);
    assert(new Set(slotKeys).size === slotKeys.length, `Lv${level} 槽位 形状+颜色 唯一`);
    assert([...slotKeys].sort().join() === [...trayKeys].sort().join(), `Lv${level} 托盘是槽位的排列`);
    if (level === 5) {
      assert(q.matchColor, `Lv5 需颜色匹配`);
      const kinds = q.slots.map((p) => p.kind);
      assert(new Set(kinds).size < kinds.length, `Lv5 存在同形状（必须靠颜色区分）`);
      const baseKind = kinds[0];
      const same = q.slots.filter((p) => p.kind === baseKind);
      assert(new Set(same.map((p) => p.color)).size >= 2, `Lv5 同形状至少两种颜色`);
    }
  }

  // 规律排序
  const p = patternsQ(level);
  assert(p.length === n, `Lv${level} 规律题数=${n}`);
  for (const q of p) {
    // seq 必须是 2/3/4 长度单元的循环（ABAB/AAB/ABB/ABC/AABC）
    const u = findUnit(q.seq);
    assert([2, 3, 4].includes(u), `Lv${level} 规律周期长度为 2/3/4（实际 ${u}）`);
    if (level <= 2) assert(u === 2, `Lv1-2 为 ABAB 两元素规律`);
    for (const pos of q.blanks) {
      assert(q.choices.includes(q.seq[pos]), `Lv${level} 空格所需答案在选项中`);
    }
    assert(new Set(q.blanks).size === q.blanks.length, `Lv${level} 空格位置不重复`);
    // 每个空格位置都能用选项中唯一对应的块填
    for (const pos of q.blanks) {
      const key = q.seq[pos];
      assert(q.shapeFor[key] && q.palette[key], `Lv${level} 答案块图形/颜色存在`);
    }
  }

  // 时钟
  const k = clockQ(level);
  assert(k.length === n, `Lv${level} 时钟题数=${n}`);
  for (const q of k) {
    assert(q.hour >= 1 && q.hour <= 12, `Lv${level} 小时 1-12`);
    const keys = q.choices.map((c) => `${c.hour}:${c.half ? 1 : 0}`);
    assert(new Set(keys).size === keys.length, `Lv${level} 时钟选项互不相同`);
    assert(keys.includes(`${q.hour}:${q.half ? 1 : 0}`), `Lv${level} 时钟选项含正确时间`);
    if (level <= 2) assert(q.choices.every((c) => !c.half), `Lv1-2 只考整点`);
    if (level === 3) assert(q.half, `Lv3 考半点`);
  }
}

// 乘除法占位版：只有 3 个难度，「N 个苹果分 M 组」必须整除
for (let level = 1; level <= 3; level++) {
  const m = multiplyQ(level);
  const n = QUESTION_COUNT[level];
  assert(m.length === n, `乘除法 Lv${level} 题数=${n}`);
  const maxGroups = [3, 5, 6][level - 1];
  const maxEach = [4, 6, 8][level - 1];
  for (const q of m) {
    assert(q.groups >= 2 && q.groups <= maxGroups, `乘除法 Lv${level} 组数范围正确`);
    assert(q.answer >= 1 && q.answer <= maxEach, `乘除法 Lv${level} 每组数范围正确`);
    assert(q.total === q.groups * q.answer, `乘除法 总数 = 组数×每组（整除）`);
    assert(q.choices.includes(q.answer), `乘除法 选项含正确答案`);
    assert(new Set(q.choices).size === 4, `乘除法 4 个不同选项`);
    assert(q.choices.every((c) => c >= 1), `乘除法 选项为正整数`);
  }
}

// 占位游戏标记与难度上限
assert(WIP_GAMES.some((g) => g.type === "multiply" && g.wip && g.maxLevel === 3), "乘除法为 wip 且 maxLevel=3");
assert(GAMES.length === 6, "主游戏仍为 6 种（乘除法不计入）");

/** 找出 seq 的最小重复周期 */
function findUnit(seq) {
  for (let u = 1; u <= seq.length; u++) {
    if (seq.every((v, i) => v === seq[i % u])) return u;
  }
  return seq.length;
}

console.log(`\n游戏出题器全部通过：${passed} 项断言（六主游戏 ×5 级 + 乘除法 ×3 级）`);
