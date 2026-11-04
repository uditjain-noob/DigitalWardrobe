import Link from "next/link";
import type { CSSProperties } from "react";

// Plain-language mapping of `registerAccount`'s error codes (NFR-5.8) — a
// user never sees the internal code, let alone anything from the mailer.
const ERROR_MESSAGES: Record<string, string> = {
  email_taken:
    "An account with that email already exists. Try signing in instead.",
  weak_password: "Choose a password with at least 12 characters.",
  invalid_email: "Enter a valid email address.",
  rate_limited:
    "Too many signup attempts from this connection. Please wait a while and try again.",
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
 * The actual markup, factored out from the page's default export so it can
 * be rendered and inspected (e.g. in tests, for the privacy-statement link)
 * without awaiting the async `searchParams` prop Next 15 passes to the page
 * itself.
 */
export function SignupForm({
  errorCode,
  mailPending,
}: {
  errorCode?: string;
  mailPending?: boolean;
}) {
  const message = errorCode
    ? ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again."
    : null;

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        Create your account
      </h1>

      {message && (
        <p role="alert" style={{ color: "#b00020", marginBottom: "1rem" }}>
          {message}
        </p>
      )}

      {mailPending && (
        // Not an error — the account was created and the person is signed
        // in. Only the verification email itself failed to send, so this is
        // a plain-language notice (NFR-5.8), not an alert.
        <p role="status" style={{ color: "#1a1a1a", marginBottom: "1rem" }}>
          Account created. If the verification email does not arrive in a
          few minutes, you can request another.
        </p>
      )}

      <form
        method="post"
        action="/api/auth/signup"
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

        <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <span>Password</span>
          <input
            type="password"
            name="password"
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
          Sign up
        </button>
      </form>

      <p style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
        By signing up you agree to our{" "}
        <Link href="/privacy" style={{ textDecoration: "underline" }}>
          privacy statement
        </Link>
        .
      </p>
    </main>
  );
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mail?: string }>;
}) {
  const { error, mail } = await searchParams;
  return <SignupForm errorCode={error} mailPending={mail === "pending"} />;
}
