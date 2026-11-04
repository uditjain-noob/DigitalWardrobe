// FR-1.4: a plain-language statement of what this app stores and what
// leaves its infrastructure, reachable from the signup screen. At this
// stage (plan 1) every data flow stays on our own servers — nothing is
// sent to any third party. Written as one section per data flow so that
// plan 3, which starts sending photos to outside services (NFR-4.5), can
// extend this page by amending one section rather than rewriting a single
// paragraph.
export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        Privacy statement
      </h1>
      <p style={{ marginBottom: "1.5rem" }}>
        This page explains, in plain language, what Digital Wardrobe stores
        about you and where it goes. We&apos;ll keep it up to date as that
        changes.
      </p>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          Your email address
        </h2>
        <p>
          Stored on our own servers, used only to identify your account and
          to send you account-related messages (like a verification email).
          It is never shared with anyone else.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          Your password
        </h2>
        <p>
          We never store your actual password — only a one-way scrambled
          version of it that cannot be turned back into your password, by us
          or anyone else.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          Photos of your items
        </h2>
        <p>
          Photos you add are stored on our own servers. Right now, nothing
          is sent to any third party — no photo leaves our infrastructure.
          A future version may add optional features that send photos to
          outside services (for example, to help identify an item); if and
          when that happens, this page will say so plainly, feature by
          feature, before it does.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          Deleting your account
        </h2>
        <p>
          Deleting your account removes your email address, password, and
          every photo and item you&apos;ve added. Nothing is kept behind.
        </p>
      </section>
    </main>
  );
}
