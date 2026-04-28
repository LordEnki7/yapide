#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0
WARNS=0

green() { echo "  ✅ $1"; }
red()   { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
warn()  { echo "  ⚠️  $1"; WARNS=$((WARNS+1)); }
header(){ echo ""; echo "── $1 ──────────────────────────────"; }

echo "🔍 YaPide Pre-Push Check"
echo "========================"

# ── 1. TypeScript ────────────────────────────────────────────────────
header "TypeScript"
# Rebuild shared lib declarations first so downstream packages see fresh types
pnpm --filter @workspace/api-client-react exec tsc --build 2>/dev/null && \
  green "Shared lib declarations rebuilt" || \
  warn "Shared lib rebuild had warnings (continuing)"

if pnpm --filter @workspace/que-lo-que exec tsc --noEmit 2>&1 | grep -q "error TS"; then
  red "Frontend TypeScript errors found"
  pnpm --filter @workspace/que-lo-que exec tsc --noEmit 2>&1 | grep "error TS" | head -5
else
  green "Frontend: no TS errors"
fi

if pnpm --filter @workspace/api-server exec tsc --noEmit 2>&1 | grep -q "error TS"; then
  red "API server TypeScript errors found"
  pnpm --filter @workspace/api-server exec tsc --noEmit 2>&1 | grep "error TS" | head -5
else
  green "API server: no TS errors"
fi

# ── 2. Public assets present ─────────────────────────────────────────
header "Public Assets"
REQUIRED_ASSETS=(
  "artifacts/que-lo-que/public/logo.png"
  "artifacts/que-lo-que/public/manifest.json"
  "artifacts/que-lo-que/public/sw.js"
  "artifacts/que-lo-que/public/favicon.svg"
  "artifacts/que-lo-que/public/icons/icon-192.png"
  "artifacts/que-lo-que/public/icons/icon-512.png"
)
for asset in "${REQUIRED_ASSETS[@]}"; do
  if [ -f "$asset" ]; then
    green "$asset"
  else
    red "$asset MISSING"
  fi
done

# ── 3. No dist/ committed ────────────────────────────────────────────
header "Git Safety"
if git diff --cached --name-only 2>/dev/null | grep -q "^artifacts/que-lo-que/dist/"; then
  red "dist/ files are staged — unstage with: git reset HEAD artifacts/que-lo-que/dist/"
else
  green "No dist/ files staged"
fi

if git diff --cached --name-only 2>/dev/null | grep -q "^\.github/workflows/"; then
  red ".github/workflows/ files are staged — remove with: git rm --cached .github/workflows/*.yml"
else
  green "No workflow files staged"
fi

# ── 4. .gitignore has dist ───────────────────────────────────────────
header ".gitignore"
if grep -q "^dist$" .gitignore; then
  green "dist/ is ignored"
else
  red "dist is NOT in .gitignore — secrets could be committed!"
fi
if grep -q "\.github/workflows/" .gitignore; then
  green ".github/workflows/ is ignored"
else
  warn ".github/workflows/ not in .gitignore (PAT may lack workflow scope)"
fi

# ── 5. No secrets in staged files ───────────────────────────────────
header "Secret Safety"
STAGED=$(git diff --cached --name-only 2>/dev/null || true)
if [ -n "$STAGED" ]; then
  if echo "$STAGED" | xargs -I{} git show ":0:{}" 2>/dev/null | grep -qiE "sk_live_|pk_live_|sk\.eyJ1|mapbox\."; then
    red "Possible secret found in staged files — double-check before pushing"
  else
    green "No obvious secrets detected in staged files"
  fi
else
  green "No staged files to check"
fi

# ── 6. Server health (if API running locally) ────────────────────────
header "API Health (local)"
API_PORT="${PORT:-8080}"
if curl -s --max-time 3 "http://localhost:$API_PORT/api/health" | grep -q '"status"'; then
  green "GET /api/health → ok"
  if curl -s --max-time 3 "http://localhost:$API_PORT/api/csrf-token" | grep -q "token\|csrf"; then
    green "GET /api/csrf-token → ok"
  else
    warn "GET /api/csrf-token did not return expected response"
  fi
  if curl -s --max-time 3 "http://localhost:$API_PORT/api/version" | grep -q "commit\|serverTime"; then
    green "GET /api/version → ok"
  else
    warn "GET /api/version not responding"
  fi
else
  warn "API not reachable on port $API_PORT (skip if not running locally)"
fi

# ── 7. Production version check ──────────────────────────────────────
header "Production"
PROD_VERSION=$(curl -s --max-time 5 "https://yapide.app/api/version" 2>/dev/null || echo "")
if echo "$PROD_VERSION" | grep -q "serverTime"; then
  SERVER_TIME=$(echo "$PROD_VERSION" | grep -o '"serverTime":"[^"]*"' | cut -d'"' -f4)
  green "yapide.app is live — serverTime: $SERVER_TIME"
else
  warn "Could not reach yapide.app/api/version (ok if offline)"
fi

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════"
if [ "$FAIL" -gt 0 ]; then
  echo "❌ $FAIL check(s) failed — fix before pushing"
  exit 1
elif [ "$WARNS" -gt 0 ]; then
  echo "⚠️  All critical checks passed ($WARNS warning(s))"
  exit 0
else
  echo "✅ All checks passed — safe to push"
  exit 0
fi
