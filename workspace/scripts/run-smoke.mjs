// 用 esbuild 打包并运行纯逻辑冒烟测试（无需 Tauri/DOM）
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = mkdtempSync(join(tmpdir(), "kidmath-test-"));
const entries = [
  "scripts/smoke-logic.mjs",
  "scripts/smoke-games.mjs",
  "scripts/smoke-achievements.mjs",
];

await build({
  entryPoints: entries,
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  outdir: out,
  entryNames: "[name]",
  absWorkingDir: root,
  logLevel: "warning",
});

for (const e of entries) {
  const file = join(out, e.split("/").pop().replace(/\.mjs$/, ".js"));
  execFileSync(process.execPath, [file], { stdio: "inherit", cwd: root });
}
