#!/bin/bash
# =============================================================================
# Rebuild and redeploy the blog
# =============================================================================
# Usage: ./rebuild.sh
#
# Run this script after modifying:
#   - config/site.yaml (site configuration)
#   - .env (environment variables)
#   - Blog content (src/content/blog/)
# =============================================================================

set -euo pipefail

# Reminder for content generation
echo "================================================"
echo "  Reminder: 如果添加了新内容，建议先运行："
echo "    pnpm generate:all"
echo "  或单独运行生成脚本以更新 LQIP、相似度和 AI 摘要数据"
echo "================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE="${ENV_FILE:-../.env}"
SKIP_DOWN="${SKIP_DOWN:-false}"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Environment file not found at $ENV_FILE"
  echo "   Copy .env.example to .env in the repository root and fill in your secrets."
  exit 1
fi

COMPOSE_CMD=(docker compose --env-file "$ENV_FILE")

echo "🔐 Using environment file: $ENV_FILE"
echo "🔄 Rebuilding blog with updated configuration..."

if [ "$SKIP_DOWN" != "true" ]; then
  echo "⏹️  Stopping existing containers..."
  "${COMPOSE_CMD[@]}" down
fi

echo "🚀 Building and starting containers..."
"${COMPOSE_CMD[@]}" up -d --build

echo "✅ Blog rebuilt and deployed!"
echo "🌐 Access at: http://localhost:4321"
