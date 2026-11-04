import { NextResponse, type NextRequest } from "next/server";

import { registerAccount } from "../../../../features/accounts/register";
import { setSessionCookie } from "../../../../lib/auth/cookies";
import { clientIp } from "../../../../lib/http/client-ip";
import { createSession } from "../../../../lib/auth/session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const result = await registerAccount({
    email,
    password,
    ip: clientIp(request),
  });

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/signup?error=${result.error}`, request.url),
      { status: 303 },
    );
  }

  // Signed in but unverified: the session exists so the user lands inside
  // the app immediately, while `emailVerifiedAt` stays null until they
  // follow the emailed link.
  const { token, expiresAt } = await createSession(result.value.userId);
  await setSessionCookie(token, expiresAt);

  // The account exists either way. If the verification email itself failed
  // to send, say so in plain language (NFR-5.8) instead of leaving the
  // person to wonder why nothing arrived — `?mail=pending` carries no
  // detail about why, only that a follow-up may be needed.
  const destination = result.value.emailDelivered ? "/" : "/signup?mail=pending";

  return NextResponse.redirect(new URL(destination, request.url), {
    status: 303,
  });
}
