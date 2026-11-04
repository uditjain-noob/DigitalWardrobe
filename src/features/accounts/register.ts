import { db } from "../../db";
import { users } from "../../db/schema";
import { getMailer } from "../../lib/email";
import { hashPassword } from "../../lib/auth/password";
import { consumeRateLimit } from "../../lib/limits/rate-limit";
import { err, ok, type Result } from "../../shared/result";
import { issueVerificationToken, verificationLink } from "./verification";

const SIGNUP_RATE_LIMIT = 5;
const SIGNUP_RATE_WINDOW_SECONDS = 60 * 60; // 1 hour — NFR-4.8.
const MIN_PASSWORD_LENGTH = 12;

// Deliberately simple: good enough to reject obviously-malformed input
// without rejecting real addresses RFC 5322 would allow. The database's
// `citext` unique constraint, not this regex, is what actually protects
// data integrity.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 23505 = unique_violation (Postgres error code), raised here only by the
// `users.email` (citext) unique constraint.
const UNIQUE_VIOLATION = "23505";

function pgErrorCode(error: unknown): unknown {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  if ("code" in error) {
    return (error as { code?: unknown }).code;
  }
  // Drizzle wraps the driver's error (which carries `.code`) in its own
  // `DrizzleQueryError`, exposed as `.cause` — unwrap one level.
  if ("cause" in error) {
    return pgErrorCode((error as { cause?: unknown }).cause);
  }
  return undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === UNIQUE_VIOLATION;
}

export type RegisterAccountInput = {
  email: string;
  password: string;
  ip: string;
};

export type RegisterAccountError =
  | "email_taken"
  | "weak_password"
  | "invalid_email"
  | "rate_limited";

/**
 * Open signup (FR-1.1): creates an unverified account and emails a
 * verification link. Does not create a session or set a cookie — that is
 * the caller's (the API route's) job, since it needs the raw session token
 * to hand to `setSessionCookie`, which this function's return type has no
 * room for.
 *
 * Rate limiting runs before any validation or database lookup, including
 * before the duplicate-email check — otherwise an attacker could probe
 * which addresses already have accounts (or simply hammer the endpoint)
 * for free by sending requests malformed enough to fail validation first.
 */
export async function registerAccount(
  input: RegisterAccountInput,
): Promise<
  Result<{ userId: string; emailDelivered: boolean }, RegisterAccountError>
> {
  const { allowed } = await consumeRateLimit(
    `signup:${input.ip}`,
    SIGNUP_RATE_LIMIT,
    SIGNUP_RATE_WINDOW_SECONDS,
  );
  if (!allowed) {
    return err("rate_limited");
  }

  if (!EMAIL_PATTERN.test(input.email)) {
    return err("invalid_email");
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return err("weak_password");
  }

  const passwordHash = await hashPassword(input.password);

  let userId: string;
  try {
    const [row] = await db
      .insert(users)
      .values({ email: input.email, passwordHash })
      .returning({ id: users.id });
    userId = row.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return err("email_taken");
    }
    throw error;
  }

  const token = await issueVerificationToken(userId);

  // Email delivery is best-effort here: the account and its verification
  // token already exist, so a provider outage must not fail signup, and the
  // mailer's internal error string (e.g. `ResendMailer`'s
  // "Failed to send email to {domain} (status {status})") must never reach
  // a user (NFR-5.8) — `RegisterAccountError` deliberately has no slot for
  // it. But swallowing the failure silently would leave the caller with no
  // way to tell this case apart from the happy path, so someone would wait
  // for an email that never arrives (the exact failure shape NFR-5.8 exists
  // to prevent). `emailDelivered` signals that out of band, alongside the
  // success value rather than through the error union, so the API route
  // can redirect the user to a plain-language notice instead of silence.
  let emailDelivered = true;
  try {
    await getMailer().send({
      to: input.email,
      subject: "Verify your Digital Wardrobe email",
      text: `Confirm your email address: ${verificationLink(token)}\n\nThis link expires in 24 hours.`,
    });
  } catch {
    emailDelivered = false;
  }

  return ok({ userId, emailDelivered });
}
