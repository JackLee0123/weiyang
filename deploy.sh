#!/bin/bash
# Everlong production deploy script (run as root on the server).
# It assumes the repo source has just been synced to /opt/everlong and that
# pnpm, Python 3.12 and uv are available on the server.
set -euo pipefail

cd /opt/everlong
export PATH="/usr/local/bin:/usr/bin:$PATH"
export UV_DEFAULT_INDEX="${UV_DEFAULT_INDEX:-https://mirrors.aliyun.com/pypi/simple/}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[deploy] installing pnpm"
  npm install -g pnpm >/dev/null
fi

echo "[deploy] pnpm install"
pnpm install --prefer-offline

echo "[deploy] build frontend"
pnpm build:frontend

echo "[deploy] watchapp deps（供服务端打包手环安装包）"
cd watchapp
npm install --no-audit --no-fund --loglevel=error
# 后端以 www 身份跑打包：依赖目录和临时构建目录都得归它，否则 aiot 连
# node_modules 里的 aapt 二进制都 chmod 不了（EPERM）
mkdir -p .build
chown -R www:www node_modules .build
cd ..

echo "[deploy] backend uv sync + migrations"
cd backend
"$HOME/.local/bin/uv" sync
"$HOME/.local/bin/uv" run alembic upgrade head
cd ..

echo "[deploy] restart backend"
systemctl restart everlong-backend

echo "[deploy] OK"
