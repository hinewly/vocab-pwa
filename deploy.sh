#!/bin/zsh
# 固定部署脚本：提交 + 推送 + 部署 Cloudflare Worker
# 用法: zsh deploy.sh "提交说明"
set -e
cd /Users/zoujiean/CodeX/vocab-pwa
git add -A
git commit -m "${1:-auto update}" || echo "(没有需要提交的改动)"
git push origin main 2>&1 | tail -3
cd worker && npx wrangler deploy 2>&1 | tail -6
echo "✅ 部署完成"
