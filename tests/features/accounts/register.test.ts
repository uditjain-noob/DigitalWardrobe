import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../../../src/db";
import { users } from "../../../src/db/schema";
import { registerAccount } from "../../../src/features/accounts/register";
import { getMailer, MemoryMailer } from "../../../src/lib/email";
import { resetTestDb } from "../../helpers/db";
import { SignupForm } from "../../../src/app/(auth)/signup/page";

// `getMailer()` returns a single shared `MemoryMailer` under
// `NODE_ENV=test` (see src/lib/email/index.ts), so this is the exact
// instance `registerAccount` sends through internally.
const mailer = getMailer() as MemoryMailer;

/**
 * No DOM/testing-library dependency is set up in this project yet (vitest
 * runs with `environment: "node"`), so rather than add one just for a
 * single link-presence check, this extracts the one anchor tag whose
 * `href` starts with `/privacy` straight out of the static-rendered HTML
 * and exposes it through a minimal `getAttribute`, which is all
 * `toHaveAttribute` below needs.
 */
function findPrivacyLink(html: string): { getAttribute(name: string): string | null } | null {
  const anchorOpenTags = html.match(/<a\b[^>]*>/gi) ?? [];
  for (const tag of anchorOpenTags) {
    const hrefMatch = tag.match(/href="([^"]*)"/);
    if (hrefMatch && hrefMatch[1].startsWith("/privacy")) {
      const attributes: Record<string, string> = {};
      const attrPattern = /([a-zA-Z-]+)="([^"]*)"/g;
      let m: RegExpExecArray | null;
      while ((m = attrPattern.exec(tag))) {
        attributes[m[1]] = m[2];
      }
      return { getAttribute: (name: string) => attributes[name] ?? null };
    }
  }
  return null;
}

declare module "vitest" {
  // `T` must stay to match vitest's own `Assertion<R, T>` shape, even though
  // this augmentation doesn't need it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<R, T> {
    toHaveAttribute(name: string, value?: string): R;
  }
}

expect.extend({
  toHaveAttribute(
    received: { getAttribute(name: string): string | null } | null,
    name: string,
    expected?: string,
  ) {
    if (!received) {
      return {
        pass: false,
        message: () => `expected an element with attribute "${name}", got none`,
      };
    }
    const actual = received.getAttribute(name);
    const pass = expected === undefined ? actual !== null : actual === expected;
    return {
      pass,
      message: () =>
        `expected element to have attribute ${name}="${expected}", got ${name}="${actual}"`,
    };
  },
});

describe("registerAccount", () => {
  beforeEach(async () => {
    await resetTestDb();
    mailer.clear();
  });

  it("creates an unverified user and sends a verification email", async () => {
    const r = await registerAccount({
      email: "a@b.com",
      password: "a-good-long-password",
      ip: "1.1.1.1",
    });

    expect(r.ok).toBe(true);
    expect(mailer.sent[0].to).toBe("a@b.com");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, "a@b.com"));
    expect(user.emailVerifiedAt).toBeNull();
  });

  it("refuses a duplicate email, case-insensitively", async () => {
    await registerAccount({
      email: "a@b.com",
      password: "a-good-long-password",
      ip: "2.2.2.2",
    });

    const r = await registerAccount({
      email: "A@B.com",
      password: "another-good-password",
      ip: "2.2.2.2",
    });

    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("email_taken");
  });

  it("refuses a password under 12 characters", async () => {
    const r = await registerAccount({
      email: "short@b.com",
      password: "short1",
      ip: "3.3.3.3",
    });

    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("weak_password");
  });

  it("refuses a malformed email", async () => {
    const r = await registerAccount({
      email: "not-an-email",
      password: "a-good-long-password",
      ip: "4.4.4.4",
    });

    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("invalid_email");
  });

  it("rate limits repeated signups from one ip", async () => {
    let last;
    for (let i = 0; i < 6; i++) {
      last = await registerAccount({
        email: `user${i}@example.com`,
        password: "a-good-long-password",
        ip: "5.5.5.5",
      });
    }

    expect(last!.ok).toBe(false);
    expect(!last!.ok && last!.error).toBe("rate_limited");
  });

  it("never stores the password in recoverable form", async () => {
    await registerAccount({
      email: "secure@b.com",
      password: "a-good-long-password",
      ip: "6.6.6.6",
    });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, "secure@b.com"));

    expect(user.passwordHash).not.toContain("a-good-long-password");
  });

  it("the signup page links to the privacy statement", () => {
    const html = renderToStaticMarkup(createElement(SignupForm, {}));
    const link = findPrivacyLink(html);

    expect(link).toHaveAttribute("href", "/privacy");
  });
});
