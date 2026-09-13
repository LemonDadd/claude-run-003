@echo off
REM =============================================================================
REM KidMath - Windows 打包脚本（NSIS .exe / .msi）
REM 前置要求：
REM   - Node.js 18+ 与 npm（https://nodejs.org）
REM   - Rust 稳定版（https://rustup.rs，安装时勾选 msvc 工具链）
REM   - Microsoft Visual Studio 2022 Build Tools（含“桌面 C++ 开发”）
REM   - WebView2 Runtime（Win11 自带；Win10 一般已预装）
REM 用法：双击或在项目根目录执行 scripts\build-windows.bat
REM =============================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

echo ==^> 检查 Node / Rust
call node -v || (echo 请先安装 Node.js & exit /b 1)
call cargo --version || (echo 请先安装 Rust ^(rustup^) & exit /b 1)

echo ==^> 安装前端依赖
call npm install || exit /b 1

echo ==^> 生成本地资源（音效）
call npm run sounds || exit /b 1

if not exist "src-tauri\icons\icon.ico" (
  echo ==^> 生成 Tauri 应用图标
  REM Windows 上若无 ImageMagick，可提前在仓库保留图标；图标已随源码提交时此步可跳过
  call npm run icons
)

echo ==^> 构建 Windows 安装包
call npm run tauri build || exit /b 1

echo.
echo ✅ 构建完成！产物位置：
echo    src-tauri\target\release\bundle\nsis\KidMath_*.exe
echo    src-tauri\target\release\bundle\msi\KidMath_*.msi
endlocal
