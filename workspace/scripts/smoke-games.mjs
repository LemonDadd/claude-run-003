// 六个游戏出题器的不变量冒烟测试（esbuild 打包后在 node 运行，不渲染组件）
import { buildQuestions as fishQ } from "../src/games/Fishing.tsx";
import { buildQuestions as compareQ } from "../src/games/Compare.tsx";
import { buildQuestions as orchardQ } from "../src/games/Orchard.tsx";
import { buildQuestions as shapesQ } from "../src/games/ShapesGame.tsx";
import { buildQuestions as patternsQ } from "../src/games/Patterns.tsx";
import { buildQuestions as clockQ } from "../src/games/ClockGame.tsx";
import { QUESTION_COUNT } from "../src/lib/gameConfig.ts";

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
  const maxBound = [5, 10, 10, 15, 20][level - 1];
  for (const q of o) {
    assert(q.choices.includes(q.answer), `Lv${level} 果园选项含答案`);
    assert(new Set(q.choices).size === 4, `Lv${level} 果园 4 个不同选项`);
    assert(q.answer >= 0, `Lv${level} 果园答案非负`);
    if (q.op === "+") {
      assert(level !== 1 || q.base + q.delta <= 5, `Lv1 加法在 5 以内`);
      assert(q.base + q.delta === q.answer, `加法答案正确`);
    } else {
      assert(level >= 2, `Lv1 不出减法`);
      assert(q.base - q.delta === q.answer && q.delta < q.base, `减法答案正确且够减`);
    }
    assert(Math.max(q.base, q.answer) <= maxBound, `Lv${level} 果园数字在 ${maxBound} 以内`);
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

/** 找出 seq 的最小重复周期 */
function findUnit(seq) {
  for (let u = 1; u <= seq.length; u++) {
    if (seq.every((v, i) => v === seq[i % u])) return u;
  }
  return seq.length;
}

console.log(`\n六个游戏 × 5 个等级出题器全部通过：${passed} 项断言`);
