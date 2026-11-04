import { NextResponse } from "next/server";

import { resendVerificationEmail } from "../../../../../features/accounts/verification";
import { getCurrentUser } from "../../../../../lib/auth/cookies";

/**
 * Takes no body — the account to resend for comes only from the current
 * session (`getCurrentUser`), never from client input. That is what lets
 * `resendVerificationEmail` reject `null` with `'unauthorized'`, which
 * this route maps to 401.
 */
export async function POST(): Promise<NextResponse> {
  const user = await getCurrentUser();
  const result = await resendVerificationEmail(user);

  if (!result.ok) {
    const status = result.error === "unauthorized" ? 401 : 429;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    emailDelivered: result.value.emailDelivered,
  });
}
