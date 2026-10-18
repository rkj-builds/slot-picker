/**
 * Refusals a backend can give, each with a reason a person can act on.
 * A screen shows `message` as it is; `code` decides what else to offer
 * (a retry, a different slot, a wait).
 */
export type DataErrorCode =
  /** Another booking or block holds that court and time. */
  | "clash"
  /** Sent too recently; `retryAt` says when it can go again. */
  | "cooldown"
  /** This role may not do this. */
  | "forbidden"
  /** The record is gone (deleted, or never existed). */
  | "not-found"
  /** The input breaks a rule; `fields` names which. */
  | "validation"
  /** Someone changed it first; reload and try again. */
  | "conflict"
  /** The network or the server failed; safe to retry. */
  | "unavailable";

export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly fields: Record<string, string>;
  readonly retryAt: number | null;

  constructor(code: DataErrorCode, message: string, { fields = {}, retryAt = null }: { fields?: Record<string, string>; retryAt?: number | null } = {}) {
    super(message);
    this.name = "DataError";
    this.code = code;
    this.fields = fields;
    this.retryAt = retryAt;
  }
}

export function isDataError(error: unknown): error is DataError {
  return error instanceof DataError;
}

/** The sentence to show for any failure, ours or not. */
export function errorMessage(error: unknown): string {
  if (isDataError(error)) return error.message;
  return "Something went wrong on our side. Try again.";
}
