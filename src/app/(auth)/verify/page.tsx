import Link from "next/link";

// `src/app/api/auth/verify/route.ts` performs the actual token consumption
// (it is what the emailed link points at) and redirects here with a
// `status` flag — this page only ever turns that flag into plain language
// (NFR-5.8); it never sees the raw token and never touches the database.
const MESSAGES: Record<string, { heading: string; body: string }> = {
  verified: {
    heading: "Email verified",
    body: "Your email address is confirmed. You're all set.",
  },
  invalid: {
    heading: "That link didn't work",
    body: "This verification link is invalid, has expired, or has already been used. Sign in and request a new one from your account settings.",
  },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const info = (status && MESSAGES[status]) || MESSAGES.invalid;

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        {info.heading}
      </h1>
      <p>{info.body}</p>
      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/" style={{ textDecoration: "underline" }}>
          Return home
        </Link>
      </p>
    </main>
  );
}
