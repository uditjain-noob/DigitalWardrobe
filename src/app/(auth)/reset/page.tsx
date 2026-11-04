import Link from "next/link";
import type { CSSProperties } from "react";

// Plain-language mapping of `confirmPasswordReset`'s error codes
// (NFR-5.8). `invalid` deliberately doesn't distinguish unknown, expired,
// already-used, or wrong-purpose tokens — see that function's comment —
// so this message can't either.
const ERROR_MESSAGES: Record<string, string> = {
  invalid:
    "This reset link is invalid, has expired, or has already been used. Request a new one below.",
  weak_password: "Choose a password with at least 12 characters.",
};

const inputStyle: CSSProperties = {
  minHeight: 44,
  padding: "0.625rem 0.75rem",
  fontSize: "1rem",
  border: "1px solid #6b6b6b",
  borderRadius: 6,
};

const buttonStyle: CSSProperties = {
  minHeight: 44,
  padding: "0.625rem 1rem",
  fontSize: "1rem",
  fontWeight: 600,
  color: "#ffffff",
  background: "#1a1a1a",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

/**
 * Step one: ask for an email address. Always followed by the same
 * "check your email" notice regardless of whether the address has an
 * account (`requestPasswordReset` returns `void` for exactly this
 * reason) — this form itself has no error state to display.
 */
export function RequestResetForm() {
  return (
    <form
      method="post"
      action="/api/auth/reset/request"
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <span>Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          style={inputStyle}
        />
      </label>

      <button type="submit" style={buttonStyle}>
        Send reset link
      </button>
    </form>
  );
}

/**
 * Step two: the link from the reset email lands here with a `token`
 * query param, which this form carries forward as a hidden field to
 * `/api/auth/reset/confirm` alongside the new password. The raw token
 * only ever travels in the URL and this hidden field — never through
 * anything this component renders as visible text.
 */
export function ConfirmResetForm({
  token,
  errorCode,
}: {
  token: string;
  errorCode?: string;
}) {
  const message = errorCode
    ? ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again."
    : null;

  return (
    <form
      method="post"
      action="/api/auth/reset/confirm"
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      {message && (
        <p role="alert" style={{ color: "#b00020" }}>
          {message}
        </p>
      )}

      <input type="hidden" name="token" value={token} />

      <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <span>New password</span>
        <input
          type="password"
          name="newPassword"
          required
          minLength={12}
          autoComplete="new-password"
          style={inputStyle}
        />
      </label>
      <p style={{ fontSize: "0.8125rem", color: "#4b4b4b" }}>
        At least 12 characters.
      </p>

      <button type="submit" style={buttonStyle}>
        Reset password
      </button>
    </form>
  );
}

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string; error?: string }>;
}) {
  const { token, status, error } = await searchParams;

  if (token) {
    return (
      <main style={{ maxWidth: 420, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Choose a new password
        </h1>
        <ConfirmResetForm token={token} errorCode={error} />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        Reset your password
      </h1>

      {status === "sent" && (
        <p role="status" style={{ color: "#1a1a1a", marginBottom: "1rem" }}>
          If an account exists for that email, we&apos;ve sent a link to
          reset the password.
        </p>
      )}

      <RequestResetForm />

      <p style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
        <Link href="/signin" style={{ textDecoration: "underline" }}>
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
