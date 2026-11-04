import type { Mailer, OutboundEmail } from "./types";

export class MemoryMailer implements Mailer {
  sent: OutboundEmail[] = [];

  async send(message: OutboundEmail): Promise<void> {
    this.sent.push(message);
  }

  clear(): void {
    this.sent = [];
  }
}
