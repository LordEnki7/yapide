#!/bin/sh
set -e

echo "Running database migrations..."
node /app/lib/db/migrate.mjs

echo "Starting server..."
exec node --enable-source-maps /app/artifacts/api-server/dist/index.mjs
