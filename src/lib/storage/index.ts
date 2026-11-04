import { S3ObjectStore } from "./s3";
import type { ObjectStore, PhotoVersion } from "./types";

export type { ObjectStore, PhotoVersion } from "./types";
export { S3ObjectStore } from "./s3";

// A single shared client under test, for the same reason as `getMailer()`
// in `src/lib/email/index.ts`: tests run serially against a real,
// per-module-registry instance rather than mocking this boundary.
let store: ObjectStore | undefined;

export function getObjectStore(): ObjectStore {
  if (!store) {
    store = new S3ObjectStore();
  }
  return store;
}

/**
 * Namespaces a photo's object key by user and version:
 * `users/{userId}/photos/{photoId}/{version}`. Tasks 16 and 17 build
 * prefix deletes (`users/{userId}/` and `users/{userId}/photos/{photoId}/`)
 * on this exact shape — do not change it without checking those.
 */
export function photoKey(
  userId: string,
  photoId: string,
  version: PhotoVersion,
): string {
  return `users/${userId}/photos/${photoId}/${version}`;
}
