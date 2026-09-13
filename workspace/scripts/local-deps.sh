#!/usr/bin/env bash
# 在无 root 环境下下载并解包 Tauri Linux 构建所需的开发库到 ~/local-pkgs/root
set -uo pipefail
ROOT="$HOME/local-pkgs"
mkdir -p "$ROOT/debs" "$ROOT/root"

# 以系统 dpkg 状态为基础（识别已安装包），仅下载缺失的 deb
cp /var/lib/dpkg/status "$ROOT/dpkg-status"
cat > "$ROOT/apt-dl.conf" <<EOF
Dir::State::Lists "$ROOT/lists";
Dir::State::status "$ROOT/dpkg-status";
Dir::Cache "$ROOT";
Dir::Cache::Archives "$ROOT/debs";
EOF

PACKAGES="libwebkit2gtk-4.1-dev libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libgtk-3-dev"

echo "=== 下载 deb 包（仅缺失依赖） ==="
apt-get -c "$ROOT/apt-dl.conf" install -d --no-install-recommends -y $PACKAGES 2>&1 | tail -20
DL_EXIT=${PIPESTATUS[0]}
echo "download exit: $DL_EXIT"

echo "=== 解包到 $ROOT/root ==="
find "$ROOT/debs" -name "*.deb" -not -name "*partial*" | while read -r deb; do
  dpkg-deb -x "$deb" "$ROOT/root" || echo "failed: $deb"
done

PCDIRS=$(find "$ROOT/root" -type d -name pkgconfig | tr '\n' ':')
LIBDIRS=$(find "$ROOT/root" -type d \( -name lib -o -name "aarch64-linux-gnu" \) -path "*/usr/*" | sort -u | tr '\n' ':')

cat > "$ROOT/env.sh" <<EOF
export PKG_CONFIG_PATH="${PCDIRS}\$PKG_CONFIG_PATH"
export LD_LIBRARY_PATH="${LIBDIRS}\$LD_LIBRARY_PATH"
export LIBRARY_PATH="${LIBDIRS}\$LIBRARY_PATH"
export C_INCLUDE_PATH="$ROOT/root/usr/include:$ROOT/root/usr/include/aarch64-linux-gnu"
export CPLUS_INCLUDE_PATH="$ROOT/root/usr/include:$ROOT/root/usr/include/aarch64-linux-gnu"
EOF
echo "=== 完成 ==="
find "$ROOT/root" -name "webkit2gtk-4.1.pc" -o -name "gtk+-3.0.pc" | head
