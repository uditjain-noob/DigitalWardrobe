import { defineConfig } from "vitest/config";

// `npm test` runs `scripts/test-db.sh` and then `vitest run` as two separate
// processes, so env vars exported inside the script do not reach this one.
// These defaults are the single source of truth for the local test
// database/object-store connection and MUST stay in sync with
// `scripts/test-db.sh`. A real DATABASE_URL etc. already in the environment
// (e.g. in CI) always wins.
const testEnvDefaults: Record<string, string> = {
  DATABASE_URL: "postgres://wardrobe:wardrobe@localhost:5432/wardrobe_test",
  S3_ENDPOINT: "http://localhost:9000",
  S3_BUCKET: "wardrobe",
  S3_ACCESS_KEY_ID: "wardrobe",
  S3_SECRET_ACCESS_KEY: "wardrobe12345",
  RESEND_API_KEY: "test_resend_key",
  APP_URL: "http://localhost:3000",
  SESSION_COOKIE_NAME: "wardrobe_session",
  MAX_ITEMS_PER_ACCOUNT: "1000",
  MAX_STORAGE_BYTES_PER_ACCOUNT: "5368709120",
  CAP_EXEMPT_EMAILS: "",
};

const testEnv = Object.fromEntries(
  Object.entries(testEnvDefaults).map(([key, fallback]) => [
    key,
    process.env[key] ?? fallback,
  ]),
);

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: testEnv,
  },
});
