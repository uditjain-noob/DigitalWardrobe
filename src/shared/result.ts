/**
 * The project's convention for expected, typed failures — as opposed to
 * exceptions, which remain for genuinely unexpected conditions (a dropped
 * database connection, a programmer error). Callers get a discriminated
 * union they must check (`r.ok`) rather than a value that might secretly be
 * an error, and the error type documents every way an operation can fail.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T, E = never>(value: T): Result<T, E> {
  return { ok: true, value };
}

export function err<E, T = never>(error: E): Result<T, E> {
  return { ok: false, error };
}
