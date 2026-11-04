import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";

/**
 * Hashes a plaintext password with argon2id — `@node-rs/argon2`'s default
 * algorithm (verified against its type declarations; not left implicit by
 * omission — there is no non-const way to name `Algorithm.Argon2id` here,
 * since it is an ambient `const enum` and TypeScript's `isolatedModules`
 * forbids inlining ambient const-enum members from a `.d.ts` with no
 * corresponding source file). Each call generates its own random salt (also
 * the library's default), so hashing the same password twice produces two
 * different encoded hashes.
 */
export async function hashPassword(plain: string): Promise<string> {
  return argon2Hash(plain);
}

/**
 * Verifies a plaintext password against a stored argon2 hash. Returns
 * `false` — rather than throwing — when the stored hash is malformed (e.g.
 * not a valid PHC-format argon2 string), since a corrupt/foreign value in
 * that column should fail auth, not crash the request.
 */
export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argon2Verify(hash, plain);
  } catch {
    return false;
  }
}
