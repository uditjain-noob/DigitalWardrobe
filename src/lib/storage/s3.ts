import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../../env";
import type { ObjectStore } from "./types";

/**
 * S3-compatible object store. `forcePathStyle: true` and a hardcoded
 * `region: "auto"` let the exact same client configuration serve both
 * Garage locally (configured with `s3_region = "auto"` in
 * `docker/garage.toml`) and Cloudflare R2 in production, which also uses
 * `"auto"` — the region never needs to be a per-environment setting.
 */
export class S3ObjectStore implements ObjectStore {
  private client: S3Client;
  private bucket: string;

  constructor(
    config: {
      endpoint: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    } = {
      endpoint: env.S3_ENDPOINT,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  ) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: "auto",
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async signedGetUrl(key: string, ttlSeconds: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }

  async delete(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }
    // `DeleteObjectsCommand` does not error on an already-absent key — it
    // reports it in `.Errors` with code `NoSuchKey` alongside the
    // successfully-deleted ones, which is exactly the "tolerate a mix of
    // present and absent keys" behaviour this method promises. We don't
    // inspect `.Errors`: a `NoSuchKey` entry means the end state (the key is
    // gone) already matches what the caller asked for.
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const object of result.Contents ?? []) {
        if (object.Key !== undefined) {
          keys.push(object.Key);
        }
      }
      continuationToken = result.IsTruncated
        ? result.NextContinuationToken
        : undefined;
    } while (continuationToken !== undefined);
    return keys;
  }
}
