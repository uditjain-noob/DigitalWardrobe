export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
};

export interface Mailer {
  send(message: OutboundEmail): Promise<void>;
}
