import { afterAll, describe, expect, it, vi } from "vitest";

import { S3ObjectStore, getObjectStore, photoKey } from "../../../src/lib/storage";

// Integration test against the Garage service from docker-compose.yml (an
// S3-compatible, locally-run stand-in for Cloudflare R2 — see that file's
// header comment for why Garage rather than MinIO). No mocking: every
// assertion here is a real HTTP round trip to a real object store.
describe("S3ObjectStore", () => {
  const store = getObjectStore();

  // Every key any test below writes, so a single `afterAll` can clean up
  // the shared bucket regardless of which assertions passed or failed —
  // this suite's own `delete` is what keeps repeated runs from
  // accumulating stray objects in the (persistent, volume-backed) bucket.
  const allKeys: string[] = [];
  function trackedKey(userId: string, photoId: string): string {
    const key = photoKey(userId, photoId, "original");
    allKeys.push(key);
    return key;
  }

  afterAll(async () => {
    await store.delete(allKeys);
  });

  it("puts an object and returns a signed url that fetches it back", async () => {
    const key = trackedKey("put-user", "p1");
    const buf = Buffer.from("test-image-bytes-put");

    await store.put(key, buf, "image/jpeg");
    const url = await store.signedGetUrl(key, 60);
    const res = await fetch(url);

    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer())).toEqual(buf);
  });

  it("an unsigned url for the same key is refused", async () => {
    const key = trackedKey("unsigned-user", "p1");
    const buf = Buffer.from("test-image-bytes-unsigned");
    await store.put(key, buf, "image/jpeg");

    const url = await store.signedGetUrl(key, 60);
    const signed = new URL(url);
    const plainUrl = `${signed.origin}${signed.pathname}`;

    // Signing enforcement — not just "the request failed somehow" — was the
    // deciding criterion for choosing Garage over the alternatives (see
    // task-8-report.md). A bare >= 400 would also pass on an unrelated
    // 404, so this asserts the literal status Garage is confirmed to
    // return for an unsigned GET (403) plus the access-denied error code
    // in the body, which together can only mean signing was rejected.
    const res = await fetch(plainUrl);
    expect(res.status).toBe(403);
    const body = await res.text();
    expect(body).toMatch(/AccessDenied/);
  });

  it("delete removes the objects", async () => {
    const key = trackedKey("delete-user", "p1");
    const buf = Buffer.from("test-image-bytes-delete");
    await store.put(key, buf, "image/jpeg");
    const url = await store.signedGetUrl(key, 60);

    // Sanity check: the object is actually there before we delete it.
    expect((await fetch(url)).status).toBe(200);

    await store.delete([key]);

    expect((await fetch(url)).status).toBeGreaterThanOrEqual(400);
  });

  it("delete of a mix of present and absent keys resolves", async () => {
    const presentKey = trackedKey("mix-user", "present");
    const absentKey = photoKey("mix-user", "absent", "original");
    await store.put(presentKey, Buffer.from("present"), "image/jpeg");

    await expect(
      store.delete([presentKey, absentKey]),
    ).resolves.toBeUndefined();
    expect(await store.exists(presentKey)).toBe(false);
  });

  it("delete surfaces a genuine per-key failure instead of resolving silently", async () => {
    // Garage (like real S3) only ever returns `NoSuchKey` in `.Errors` for
    // an already-absent key — there is no reliable way to provoke a
    // genuine failure (throttling, an internal error, access denied on one
    // key) against a real running server from a test. So this stubs the
    // S3 client's `send` for this one call to return a partial-failure
    // response carrying a non-`NoSuchKey` code, on a throwaway store
    // instance (not the shared `store`, so no other test is affected).
    const isolatedStore = new S3ObjectStore();
    const client = (isolatedStore as unknown as { client: { send: unknown } })
      .client;
    const sendSpy = vi
      .spyOn(client as { send: (...args: unknown[]) => unknown }, "send")
      .mockResolvedValueOnce({
        Errors: [
          { Key: "users/x/photos/y/original", Code: "AccessDenied" },
        ],
      });

    await expect(isolatedStore.delete(["irrelevant-key"])).rejects.toThrow(
      /AccessDenied/,
    );

    sendSpy.mockRestore();
  });

  it("exists reports true for a stored key and false for an absent one", async () => {
    const storedKey = trackedKey("exists-user", "p1");
    const absentKey = photoKey("exists-user", "p1", "thumb");
    await store.put(storedKey, Buffer.from("exists"), "image/jpeg");

    expect(await store.exists(storedKey)).toBe(true);
    expect(await store.exists(absentKey)).toBe(false);
  });

  it("list returns every key under a prefix and nothing outside it", async () => {
    const original = photoKey("list-user", "p1", "original");
    const thumb = photoKey("list-user", "p1", "thumb");
    const outside = photoKey("list-user-other", "p1", "original");
    allKeys.push(original, thumb, outside);

    await store.put(original, Buffer.from("o"), "image/jpeg");
    await store.put(thumb, Buffer.from("t"), "image/jpeg");
    await store.put(outside, Buffer.from("x"), "image/jpeg");

    const listed = await store.list("users/list-user/");

    expect(listed.sort()).toEqual([original, thumb].sort());
  });

  it("photoKey namespaces by user and version", () => {
    expect(photoKey("u1", "p1", "thumb")).toBe("users/u1/photos/p1/thumb");
  });
});
