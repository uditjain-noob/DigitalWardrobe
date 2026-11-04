/**
 * The three photo renditions a captured item can have in object storage.
 * `original` is stored synchronously on upload; `display` and `thumb` are
 * rendered by a later pg-boss job (plan 1 Task 11).
 */
export type PhotoVersion = "original" | "display" | "thumb";

/**
 * The object-storage boundary. Implementations are S3-compatible (Garage
 * locally, Cloudflare R2 in production) — see `src/lib/storage/s3.ts`.
 *
 * The bucket behind this interface is always private: nothing is ever made
 * public. Reads happen only through `signedGetUrl`'s short-lived, unguessable
 * URLs (NFR-3.6).
 */
export interface ObjectStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  signedGetUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(keys: string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
}
