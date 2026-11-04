import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { consumeRateLimit } from "../../../src/lib/limits/rate-limit";
import { resetTestDb } from "../../helpers/db";

describe("consumeRateLimit", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await consumeRateLimit("k", 3, 60)).allowed).toBe(true);
    }
  });

  it("refuses past the limit and reports retryAfterSeconds", async () => {
    for (let i = 0; i < 3; i++) {
      await consumeRateLimit("k", 3, 60);
    }

    const r = await consumeRateLimit("k", 3, 60);

    expect(r.allowed).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keys are independent", async () => {
    for (let i = 0; i < 3; i++) {
      await consumeRateLimit("signin:a@b.com", 3, 60);
    }

    const sameKeyAgain = await consumeRateLimit("signin:a@b.com", 3, 60);
    const otherKey = await consumeRateLimit("signup:1.2.3.4", 3, 60);

    expect(sameKeyAgain.allowed).toBe(false);
    expect(otherKey.allowed).toBe(true);
  });

  it("allows again in a new window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    for (let i = 0; i < 3; i++) {
      expect((await consumeRateLimit("k", 3, 60)).allowed).toBe(true);
    }
    expect((await consumeRateLimit("k", 3, 60)).allowed).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));

    expect((await consumeRateLimit("k", 3, 60)).allowed).toBe(true);
  });

  it("is atomic under concurrency: 10 parallel calls with limit 3 allow exactly 3", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => consumeRateLimit("k", 3, 60)),
    );

    expect(results.filter((r) => r.allowed)).toHaveLength(3);
  });
});
