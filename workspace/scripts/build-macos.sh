#!/usr/bin/env bash
# =============================================================================
# KidMath - macOS 打包脚本（.app / .dmg）
# 前置要求：
#   - Node.js 18+ 与 npm
#   - Rust 稳定版（https://rustup.rs）
#   - macOS 自带 Xcode Command Line Tools
# 用法：bash scripts/build-macos.sh
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> 检查 Node / Rust"
node -v
cargo --version

echo "==> 安装前端依赖"
npm install

echo "==> 生成本地资源（音效）"
npm run sounds

echo "==> 生成 Tauri 应用图标（若缺失）"
if [ ! -f "src-tauri/icons/icon.icns" ]; then
  npm run icons
fi

echo "==> 构建 macOS 应用（debug 快速验证可改为：npm run tauri build -- --debug）"
npm run tauri build

echo ""
echo "✅ 构建完成！产物位置："
echo "   src-tauri/target/release/bundle/macos/KidMath.app"
echo "   src-tauri/target/release/bundle/dmg/KidMath_*.dmg"
