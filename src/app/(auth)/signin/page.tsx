import Link from "next/link";
import type { CSSProperties } from "react";

// Plain-language mapping of `signIn`'s error codes (NFR-5.8) — a user
// never sees the internal code.
const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  rate_limited:
    "Too many sign-in attempts for this account. Please wait a while and try again.",
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
 * Markup factored out from the page's default export, same reason as
 * `SignupForm`: it can be rendered and inspected directly (e.g. in tests)
 * without awaiting the async `searchParams` prop Next 15 passes to the
 * page itself.
 */
export function SignInForm({
  errorCode,
  justReset,
}: {
  errorCode?: string;
  justReset?: boolean;
}) {
  const message = errorCode
    ? ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again."
    : null;

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Sign in</h1>

      {message && (
        <p role="alert" style={{ color: "#b00020", marginBottom: "1rem" }}>
          {message}
        </p>
      )}

      {justReset && (
        <p role="status" style={{ color: "#1a1a1a", marginBottom: "1rem" }}>
          Your password has been reset. Sign in with your new password.
        </p>
      )}

      <form
        method="post"
        action="/api/auth/signin"
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
            autoComplete="current-password"
            style={inputStyle}
          />
        </label>

        <button type="submit" style={buttonStyle}>
          Sign in
        </button>
      </form>

      <p style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
        <Link href="/reset" style={{ textDecoration: "underline" }}>
          Forgot your password?
        </Link>
      </p>
      <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" style={{ textDecoration: "underline" }}>
          Sign up
        </Link>
        .
      </p>
    </main>
  );
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { error, status } = await searchParams;
  return <SignInForm errorCode={error} justReset={status === "reset"} />;
}
