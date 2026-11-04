import { defineConfig } from "drizzle-kit";

// Keep this fallback in sync with vitest.config.ts / scripts/test-db.sh.
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://wardrobe:wardrobe@localhost:5432/wardrobe_test";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
