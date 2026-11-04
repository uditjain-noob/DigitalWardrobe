import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../../../src/lib/auth/password";

describe("hashPassword / verifyPassword", () => {
  it("produces a hash that is not the password", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash).not.toContain("correct horse");
  });

  it("verifies the right password", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword(hash, "correct horse")).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword(hash, "wrong horse")).toBe(false);
  });

  it("salts: two hashes of the same password differ", async () => {
    const a = await hashPassword("correct horse");
    const b = await hashPassword("correct horse");
    expect(a).not.toBe(b);
  });

  it("returns false rather than throwing on a malformed hash", async () => {
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
});
