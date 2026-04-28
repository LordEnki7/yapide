#!/usr/bin/env bash
set -euo pipefail

echo "🚀 YaPide → Dokploy deploy"
echo ""

echo "🔍 Running pre-push checks..."
bash scripts/pre-push-check.sh || { echo "❌ Pre-push checks failed — fix issues before deploying"; exit 1; }
echo ""

echo "🗂  Staging all changes..."
git add -A
git reset HEAD .github/workflows/ 2>/dev/null || true

echo "💾 Committing..."
git commit -m "deploy: $(git rev-parse --short HEAD) $(date -u +"%Y-%m-%dT%H:%M:%SZ")" || echo "(nothing new to commit)"

echo "⬆️  Pushing to origin/main..."
git push origin main

echo ""
echo "✅ Done! Dokploy will rebuild in ~2 min."
echo "   Verify: https://yapide.app/api/version"
