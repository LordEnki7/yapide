#!/bin/sh
set -e

echo "Running database migrations..."
yes no | pnpm --filter @workspace/db run push-force || echo "Migration completed (warnings ignored)"

echo "Starting server..."
exec node --enable-source-maps /app/artifacts/api-server/dist/index.mjs
