#!/bin/sh
# One-shot bootstrap for a local Garage instance: assigns the single-node
# layout, creates the bucket, imports a fixed access key, and grants it
# read/write/owner on the bucket. Idempotent — safe to run on every
# `docker compose up`. Talks only to Garage's admin API (HTTP + curl), since
# the `dxflrs/garage` server image is distroless and has no shell to run a
# script like this one *inside* it.
set -eu

: "${GARAGE_ADMIN_URL:?}"
: "${GARAGE_ADMIN_TOKEN:?}"
: "${S3_BUCKET:?}"
: "${S3_ACCESS_KEY_ID:?}"
: "${S3_SECRET_ACCESS_KEY:?}"

auth() { echo "Authorization: Bearer ${GARAGE_ADMIN_TOKEN}"; }

json_field() {
  # Extracts the string or number value of a top-level-ish `"name": value`
  # field from a single-line-friendly JSON blob. Good enough for the flat
  # fields this script reads; not a general JSON parser.
  echo "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"\{0,1\}[^,}\"]*" | sed -E "s/.*:[[:space:]]*\"?//"
}

echo "garage-init: waiting for admin API"
until curl -s -o /dev/null "${GARAGE_ADMIN_URL}/v1/status"; do
  sleep 0.5
done

STATUS=$(curl -s -H "$(auth)" "${GARAGE_ADMIN_URL}/v1/status")
NODE_ID=$(json_field "$STATUS" node)
echo "garage-init: node id = ${NODE_ID}"

LAYOUT=$(curl -s -H "$(auth)" "${GARAGE_ADMIN_URL}/v1/layout")
if echo "$LAYOUT" | grep -q '"roles":[[:space:]]*\[\]'; then
  VERSION=$(json_field "$LAYOUT" version)
  echo "garage-init: assigning layout (base version ${VERSION})"
  curl -sf -X POST -H "$(auth)" -H "Content-Type: application/json" \
    "${GARAGE_ADMIN_URL}/v1/layout" \
    -d "[{\"id\":\"${NODE_ID}\",\"zone\":\"dc1\",\"capacity\":1000000000,\"tags\":[]}]" >/dev/null
  curl -sf -X POST -H "$(auth)" -H "Content-Type: application/json" \
    "${GARAGE_ADMIN_URL}/v1/layout/apply" \
    -d "{\"version\":$((VERSION + 1))}" >/dev/null
else
  echo "garage-init: layout already assigned, skipping"
fi

echo "garage-init: ensuring bucket '${S3_BUCKET}' exists"
CREATE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$(auth)" -H "Content-Type: application/json" \
  "${GARAGE_ADMIN_URL}/v1/bucket" -d "{\"globalAlias\":\"${S3_BUCKET}\"}")
if [ "$CREATE_HTTP" != "200" ] && [ "$CREATE_HTTP" != "409" ]; then
  echo "garage-init: unexpected status $CREATE_HTTP creating bucket" >&2
  exit 1
fi

echo "garage-init: ensuring access key exists"
IMPORT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$(auth)" -H "Content-Type: application/json" \
  "${GARAGE_ADMIN_URL}/v1/key/import" \
  -d "{\"accessKeyId\":\"${S3_ACCESS_KEY_ID}\",\"secretAccessKey\":\"${S3_SECRET_ACCESS_KEY}\",\"name\":\"wardrobe-local\"}")
if [ "$IMPORT_HTTP" != "200" ] && [ "$IMPORT_HTTP" != "409" ]; then
  echo "garage-init: unexpected status $IMPORT_HTTP importing key" >&2
  exit 1
fi

BUCKET_INFO=$(curl -sf -H "$(auth)" "${GARAGE_ADMIN_URL}/v1/bucket?globalAlias=${S3_BUCKET}")
BUCKET_ID=$(json_field "$BUCKET_INFO" id)
echo "garage-init: bucket id = ${BUCKET_ID}"

echo "garage-init: granting read/write/owner on '${S3_BUCKET}' to '${S3_ACCESS_KEY_ID}'"
curl -sf -X POST -H "$(auth)" -H "Content-Type: application/json" \
  "${GARAGE_ADMIN_URL}/v1/bucket/allow" \
  -d "{\"bucketId\":\"${BUCKET_ID}\",\"accessKeyId\":\"${S3_ACCESS_KEY_ID}\",\"permissions\":{\"read\":true,\"write\":true,\"owner\":true}}" >/dev/null

echo "garage-init: done"
