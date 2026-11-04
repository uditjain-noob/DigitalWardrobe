import type { Mailer } from "./types";
import { MemoryMailer } from "./memory";
import { ResendMailer } from "./resend";

export type { Mailer, OutboundEmail } from "./types";
export { MemoryMailer } from "./memory";
export { ResendMailer } from "./resend";

// A single shared instance under test, so code under test and the test
// itself (`getMailer()` called separately in each) observe the same
// `.sent` array. Each test *file* gets its own module registry under
// Vitest's default isolation, so this does not leak state across files;
// within a file, tests are expected to call `.clear()` between cases.
let testMailer: MemoryMailer | undefined;

export function getMailer(): Mailer {
  if (process.env.NODE_ENV === "test") {
    if (!testMailer) {
      testMailer = new MemoryMailer();
    }
    return testMailer;
  }
  return new ResendMailer();
}
