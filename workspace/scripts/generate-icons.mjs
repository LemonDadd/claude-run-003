#!/usr/bin/env node
/**
 * 生成应用图标：app-icon.svg → 1024 PNG → Tauri 各平台图标集
 * 依赖：ImageMagick（convert）与 @tauri-apps/cli
 * 产物：src-tauri/icons/（png/ico/icns）
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = resolve(root, "app-icon.svg");
const png = resolve(root, "app-icon.png");
const iconDir = resolve(root, "src-tauri/icons");

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", cwd: root });
}

if (!existsSync(svg)) {
  console.error("缺少 app-icon.svg");
  process.exit(1);
}

// SVG -> 1024x1024 PNG
run("convert", ["-background", "none", "-density", "384", svg, "-resize", "1024x1024", png]);

if (existsSync(iconDir)) rmSync(iconDir, { recursive: true, force: true });
mkdirSync(iconDir, { recursive: true });

// Tauri 生成全平台图标
run("npx", ["tauri", "icon", png, "--output", iconDir]);
console.log("图标生成完成：", iconDir);
