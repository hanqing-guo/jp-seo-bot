#!/bin/bash
# JP SEO Bot — DeepSeek 一键设置 + 启动(双击运行即可)
cd "$(dirname "$0")"

clear
echo "═══════════════════════════════════════════"
echo "      JP SEO Bot — DeepSeek 一键设置"
echo "═══════════════════════════════════════════"
echo ""
echo "把你的 DeepSeek key(sk- 开头那串)粘贴到下面,"
echo "然后按一下【回车】键:"
echo ""
printf "key ▶ "
read -r KEY
KEY="$(echo "$KEY" | tr -d '[:space:]')"

if [ -z "$KEY" ]; then
  echo ""
  echo "❌ 没收到 key。请重新双击本文件再试一次。"
  echo "(按回车键关闭本窗口)"
  read -r _
  exit 1
fi

printf 'DEEPSEEK_API_KEY=%s\n' "$KEY" > supabase/.env
echo ""
echo "✓ key 已保存"

# 前端没在跑就顺手起一个
if ! curl -s -o /dev/null http://localhost:5180 2>/dev/null; then
  echo "✓ 正在启动网页(前端)…"
  (npm run dev >/tmp/jp-seo-frontend.log 2>&1 &)
fi

echo "✓ 正在启动 AI 后端…"
echo ""
echo "──────────────────────────────────────────"
echo " 看到下面出现「Listening on …:8000」就成功了!"
echo " 然后打开浏览器: http://localhost:5180"
echo " 进任意关键词 → 点「今月の AI 記事を生成」"
echo ""
echo " ※ 这个窗口【别关】。要停止就按 Control + C。"
echo "──────────────────────────────────────────"
echo ""
exec npm run api:local
