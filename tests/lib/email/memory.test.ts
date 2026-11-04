import { describe, expect, it } from "vitest";

import { MemoryMailer } from "../../../src/lib/email/memory";
import type { OutboundEmail } from "../../../src/lib/email/types";

describe("MemoryMailer", () => {
  it("records what was sent", async () => {
    const mailer = new MemoryMailer();
    const msg: OutboundEmail = {
      to: "test@example.com",
      subject: "Test Subject",
      text: "Test body",
    };

    await mailer.send(msg);

    expect(mailer.sent).toEqual([msg]);
  });

  it("clear() empties the record", async () => {
    const mailer = new MemoryMailer();
    const msg: OutboundEmail = {
      to: "test@example.com",
      subject: "Test Subject",
      text: "Test body",
    };

    await mailer.send(msg);
    expect(mailer.sent).toHaveLength(1);

    mailer.clear();

    expect(mailer.sent).toHaveLength(0);
  });
});
