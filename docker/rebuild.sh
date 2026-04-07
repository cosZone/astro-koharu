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
echo "  Reminder: If you added new content, consider running first:"
echo "    pnpm koharu generate all"
echo "  to update LQIP, similarity vectors, and AI summaries."
echo "================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
SKIP_DOWN="${SKIP_DOWN:-false}"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Environment file not found at $ENV_FILE"
  echo "   Copy .env.example to .env in the repository root and fill in your values."
  exit 1
fi

COMPOSE_CMD=(docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/docker-compose.yml")

echo "🔐 Using environment file: $ENV_FILE"
echo "🔄 Rebuilding blog with updated configuration..."

if [ "$SKIP_DOWN" != "true" ]; then
  echo "⏹️  Stopping existing containers..."
  "${COMPOSE_CMD[@]}" down
fi

echo "🚀 Building and starting containers..."
"${COMPOSE_CMD[@]}" up -d --build

BLOG_PORT=$(grep -E '^BLOG_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d '"' || true)
echo "✅ Blog rebuilt and deployed!"
echo "🌐 Access at: http://localhost:${BLOG_PORT:-4321}"
