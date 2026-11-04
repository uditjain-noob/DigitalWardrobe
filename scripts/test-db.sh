#!/usr/bin/env bash
# Brings up the compose services if they are down, creates the test
# database, and runs migrations against it. Run by `npm test` before
# `vitest run`.
set -euo pipefail
cd "$(dirname "$0")/.."

PG_USER="wardrobe"
TEST_DB_NAME="wardrobe_test"
# Keep in sync with vitest.config.ts's DATABASE_URL fallback.
TEST_DATABASE_URL="postgres://${PG_USER}:wardrobe@localhost:5432/${TEST_DB_NAME}"

echo "test-db: ensuring postgres is up"
docker compose up -d postgres

# Best-effort: this task's own tests only need Postgres. Object storage
# (MinIO) is wired here for later tasks (e.g. Task 8), but is not required
# for `npm test` to pass right now, so a pull failure here does not fail the
# harness.
echo "test-db: ensuring minio is up (best-effort)"
if ! docker compose up -d minio minio-init; then
  echo "test-db: warning — could not start minio/minio-init (run 'docker compose logs minio' to see why); continuing, since this task's tests do not use object storage" >&2
fi

echo "test-db: waiting for postgres to accept connections"
until docker compose exec -T postgres pg_isready -U "$PG_USER" >/dev/null 2>&1; do
  sleep 0.5
done

echo "test-db: ensuring database '${TEST_DB_NAME}' exists"
if ! docker compose exec -T postgres psql -U "$PG_USER" -tAc \
  "select 1 from pg_database where datname = '${TEST_DB_NAME}'" | grep -q 1; then
  docker compose exec -T postgres psql -U "$PG_USER" -c "create database ${TEST_DB_NAME}"
fi

export DATABASE_URL="$TEST_DATABASE_URL"

# schema.ts is empty until Task 2, so drizzle/meta/_journal.json (committed)
# lists zero migrations. drizzle-kit migrate no-ops cleanly against that —
# verified exit 0 — as long as the journal file exists; an entirely absent
# `drizzle/` directory makes it fail instead, which is why the empty journal
# is committed rather than left to be generated on the fly.
echo "test-db: running migrations"
npx drizzle-kit migrate
