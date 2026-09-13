# KidMath 儿童数学启蒙游戏

一款面向 **3–8 岁儿童**的纯离线桌面应用，基于 **Tauri 2 + React 18 + TypeScript + SQLite**，支持 **macOS** 与 **Windows**。

- 🔌 全程免登录、**零网络请求**、无广告、无内购，所有资源本地打包
- 👦👧 多儿童档案，星星 / 进度 / 成就 / 饰品完全隔离，首页一键切换玩家
- 🎮 六种数学小游戏，每种 5 个难度等级
- ⭐ 星星奖励、饰品收集与装扮、三类成就徽章
- 👪 家长 PIN 面板：每日时长、正确率与游戏进度、手动调级、重置 / 删除档案

## 六种游戏

| 游戏 | 玩法 | 难度进阶 |
| --- | --- | --- |
| 🐟 数数捕鱼 | 点击游动的鱼计数，选出总数 | 3 以内 → 20 以内 |
| 🍎 比较大小 | 点击左右两组物品中更多的一边 | 5 以内 → 20 以内 |
| 🍊 加减法果园 | 果园情境加减应用题 | 5 以内加法 → 20 以内加减 |
| 🔷 图形配对 | 拖拽图形到对应位置 | Lv.5 需同形状同颜色 |
| 🌟 规律排序 | ABAB / AAB / ABB / ABC 序列拖拽补全 | 2 空 → 3 空 |
| 🕐 认时钟 | 整点与半点 | 整点 → 半点 → 混合 |

第一版**不包含**乘除法、分数、货币认知和数独，它们在首页"即将推出"区展示。

每回合 5–10 题（按等级），**答对**绿色高亮 + 星星粒子 + 清脆音效 + 语音"答对啦"；**答错**轻微抖动 + 温和音效 + 语音"再试一次"，不显示红叉、不惩罚，可一直重试。单回合正确率 ≥80% 得 1 颗星，100% 得 2 颗星。

## 激励系统

- **星星**：每累计 5 颗星解锁一件饰品（帽子、眼镜、背景、宠物，图鉴见 `/gallery`）
- **成就徽章**
  - 坚持类：初次冒险、小小坚持家（累计 10 回合）、连续三天
  - 精通类：百发百中（一个游戏全部一次答对）、答题达人（累计答对 50 题）
  - 探索类：小小探险家（玩遍六种游戏）、收藏家（解锁 5 个饰品）

## 家长面板（PIN）

- 首页或选择玩家页右下角 **"👪 家长入口"** 进入
- **默认 PIN 为 `0000`，首次进入会提示修改**
- PIN 使用 SHA-256（加盐）哈希后存入 SQLite，不保存明文
- PIN 错误无法进入面板，也无法修改时长 / 重置 / 删除档案
- 可设置每日游玩时长：**默认 25 分钟，可调 10–60 分钟**；到点弹出温和的"该休息啦"动画，已自动保存进度并返回首页
- 可查看每个孩子的总正确率、各游戏回合数与最佳正确率，手动调整 Level（或恢复按年龄推荐）

> 年龄自动计算，默认难度 `Level = max(1, min(5, 年龄 - 2))`，家长可覆盖。

## 数据与隐私

数据保存在本机 SQLite（通过 Tauri command 封装，前端不直接访问文件系统）：

- macOS：`~/Library/Application Support/com.kidmath.app/kidmath.db`
- Windows：`%APPDATA%\com.kidmath.app\kidmath.db`

表：`Profile`、`GameRecord`、`Achievement`、`ParentSettings`、`DailyUsage`、`UnlockedItem`。
应用**禁用 Tauri HTTP 权限**，前端没有任何 `fetch` / `axios` / CDN 引用；CSP 仅允许本地资源。

## 环境要求（开发）

- Node.js **18+**（推荐 20 LTS）与 npm
- Rust 稳定版：<https://rustup.rs>
- Tauri 2 平台依赖：
  - **macOS**：`xcode-select --install`
  - **Windows**：Visual Studio 2022 Build Tools（勾选"使用 C++ 的桌面开发"）、WebView2（Win11 自带）
  - Linux（仅开发用）：参考 <https://tauri.app/start/prerequisites/#linux>

## 开发启动

```bash
npm install

# 生成图标与本地音效（图标需系统有 ImageMagick；音效无额外依赖）
npm run assets

# 开发模式（自动启动 Vite 与 Tauri 窗口）
npm run tauri dev
```

## 自测

```bash
# 前端纯逻辑冒烟测试：星级规则、年龄→Level、饰品解锁、六游戏各 5 级出题器
npm run test:logic

# Rust 端数据库集成测试（默认 PIN、档案隔离、成就幂等、时长 UPSERT）
cd src-tauri && cargo test
```

## 打包

### macOS

```bash
bash scripts/build-macos.sh
```

产物：

- `src-tauri/target/release/bundle/macos/KidMath.app`
- `src-tauri/target/release/bundle/dmg/KidMath_*.dmg`

### Windows

```bat
scripts\build-windows.bat
```

产物：

- `src-tauri\target\release\bundle\nsis\KidMath_*.exe`（NSIS 安装包）
- `src-tauri\target\release\bundle\msi\KidMath_*.msi`

也可以直接：

```bash
npm run tauri build
```

## 验收自测建议

1. 首次启动选择"新建小玩家"，创建档案后进入首页
2. 每个游戏都能完整打完一轮并进入奖励页 `/reward`
3. 奖励页星星：全部一次答对 2 颗，正确率 ≥80% 1 颗
4. 回选择玩家页创建第二个孩子，两边星星与进度互不影响
5. 家长入口输错 PIN 无法进入；`0000` 可进入并改 PIN
6. 把每日时长临时调到 10 分钟（或直接游玩到限），出现"该休息啦"动画并回首页
7. 断网后重新启动应用，一切功能正常；重启后星星、记录仍在

## 目录结构

```
src/
  components/   通用组件（反馈粒子、拖拽、时钟、PIN 键盘等）
  games/        六个游戏与统一回合流程 useRound
  lib/          Tauri API 封装、游戏配置、语音音效、饰品图鉴
  pages/        路由页面（选择玩家/首页/游戏容器/奖励/图鉴/家长）
  store/        Zustand 按档案隔离的全局状态
src-tauri/src/  Rust 端：数据库初始化、所有 Tauri command
scripts/        macOS / Windows 构建脚本与资源生成脚本
```

## 设计说明

- 数据库访问全部经 Rust 端 Tauri command（`src/lib/api.ts` 是唯一出入口），前端不直接接触文件系统
- 答对/答错反馈同步触发（CSS 动画 + Web Audio + TTS），在 500ms 内呈现；答错只轻微抖动、可无限重试，不出现红叉与"失败"字样
- 拖拽使用原生 pointer events（`src/components/DragnDrop.tsx`），未命中槽位自动回弹
- TTS 优先使用 Web Speech API 中文语音，无语音环境静音降级；音效优先本地 `public/sounds/*.wav`，缺失时用 Web Audio 合成兜底
- `scripts/local-deps.sh` 仅供无 root 的 Linux 容器/CI 下载 GTK/WebKit 开发库到用户目录，macOS 与 Windows 打包不需要它

