#!/usr/bin/env node
/**
 * 生成纯本地的提示音 wav 文件（无版权、无网络资源）。
 * 产物写入 public/sounds/，运行时由 Web Audio / <audio> 播放；
 * 即使资源缺失，前端 feedback.ts 也会用 Web Audio 合成兜底（静音降级可玩）。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/sounds");
mkdirSync(outDir, { recursive: true });

const SR = 22050;

function pcm(notes, totalSec) {
  const total = Math.floor(SR * totalSec);
  const buf = new Float32Array(total);
  for (const { freq, start, dur, type = "sine", gain = 0.25 } of notes) {
    const s0 = Math.floor(start * SR);
    for (let i = 0; i < dur * SR; i++) {
      const t = i / SR;
      let v = 0;
      switch (type) {
        case "triangle":
          v = Math.asin(Math.sin(2 * Math.PI * freq * t)) * (2 / Math.PI);
          break;
        case "square":
          v = Math.sign(Math.sin(2 * Math.PI * freq * t));
          break;
        default:
          v = Math.sin(2 * Math.PI * freq * t);
      }
      // 简单指数包络，避免爆音
      const env = Math.min(1, t / 0.01) * Math.exp(-3 * t / dur);
      if (s0 + i < total) buf[s0 + i] += v * env * gain;
    }
  }
  return buf;
}

function toWav(samples) {
  const n = samples.length;
  const size = 44 + n * 2;
  const b = Buffer.alloc(size);
  b.write("RIFF", 0);
  b.writeUInt32LE(size - 8, 4);
  b.write("WAVE", 8);
  b.write("fmt ", 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    b.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return b;
}

const tracks = {
  // 答对：C5-E5-G5 清脆上行
  correct: {
    sec: 0.6,
    notes: [
      { freq: 523.25, start: 0, dur: 0.18, gain: 0.3 },
      { freq: 659.25, start: 0.1, dur: 0.18, gain: 0.3 },
      { freq: 783.99, start: 0.2, dur: 0.32, gain: 0.32 },
    ],
  },
  // 答错：柔和下行（不刺耳）
  wrong: {
    sec: 0.55,
    notes: [
      { freq: 392, start: 0, dur: 0.24, gain: 0.18 },
      { freq: 329.63, start: 0.18, dur: 0.32, gain: 0.18 },
    ],
  },
  // 星星
  star: {
    sec: 0.35,
    notes: [
      { freq: 1046.5, start: 0, dur: 0.12, gain: 0.22 },
      { freq: 1567.98, start: 0.08, dur: 0.22, gain: 0.18 },
    ],
  },
  // 按钮
  click: { sec: 0.1, notes: [{ freq: 660, start: 0, dur: 0.08, type: "triangle", gain: 0.16 }] },
  // 回合小礼花
  fanfare: {
    sec: 0.9,
    notes: [523.25, 587.33, 659.25, 783.99, 1046.5].map((freq, i) => ({
      freq,
      start: i * 0.12,
      dur: 0.26,
      type: "triangle",
      gain: 0.2,
    })),
  },
};

for (const [name, { sec, notes }] of Object.entries(tracks)) {
  const wav = toWav(pcm(notes, sec));
  const file = resolve(outDir, `${name}.wav`);
  writeFileSync(file, wav);
  console.log("生成", file);
}
console.log("音效生成完成");
