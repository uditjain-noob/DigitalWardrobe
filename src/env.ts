import { z } from "zod";

/**
 * Comma-separated list coerced to a trimmed, non-empty string array.
 * `""` and unset both become `[]`.
 */
const commaSeparatedList = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  S3_ENDPOINT: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  APP_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().min(1),
  // NFR-7.3: per-account caps are configurable without a code change.
  MAX_ITEMS_PER_ACCOUNT: z.coerce.number().int().positive(),
  MAX_STORAGE_BYTES_PER_ACCOUNT: z.coerce.number().int().positive(),
  CAP_EXEMPT_EMAILS: commaSeparatedList,
});

export type Env = z.infer<typeof envSchema>;

/**
 * Pure validation of a plain env-like object into a typed `Env`. Takes a
 * plain object (never reads `process.env` itself) so it can be tested with
 * arbitrary input and reused anywhere a raw env map is available (e.g. the
 * worker entrypoint).
 */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${problems}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
