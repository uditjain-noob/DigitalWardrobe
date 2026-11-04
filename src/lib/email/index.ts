import type { Mailer } from "./types";
import { MemoryMailer } from "./memory";
import { ResendMailer } from "./resend";

export type { Mailer, OutboundEmail } from "./types";
export { MemoryMailer } from "./memory";
export { ResendMailer } from "./resend";

export function getMailer(): Mailer {
  if (process.env.NODE_ENV === "test") {
    return new MemoryMailer();
  }
  return new ResendMailer();
}
