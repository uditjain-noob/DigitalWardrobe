import { env } from "../../env";
import type { Mailer, OutboundEmail } from "./types";

export class ResendMailer implements Mailer {
  private apiKey: string;
  private fromAddress: string = "noreply@digital-wardrobe.app";

  constructor(apiKey: string = env.RESEND_API_KEY) {
    this.apiKey = apiKey;
  }

  async send(message: OutboundEmail): Promise<void> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: message.to,
          subject: message.subject,
          text: message.text,
        }),
      });

      if (!response.ok) {
        // Extract domain from email to avoid logging the full address
        const domain = message.to.split("@")[1] || "unknown";
        const status = response.status;
        throw new Error(
          `Failed to send email to ${domain} (status ${status})`,
        );
      }
    } catch (error) {
      // If it's already our custom error, re-throw it
      if (error instanceof Error && error.message.startsWith("Failed to send")) {
        throw error;
      }

      // For network or other errors, extract domain and throw
      const domain = message.to.split("@")[1] || "unknown";
      throw new Error(`Failed to send email to ${domain}`);
    }
  }
}
