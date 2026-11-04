import { NextResponse, type NextRequest } from "next/server";

import { signIn } from "../../../../features/accounts/signin";
import { setSessionCookie } from "../../../../lib/auth/cookies";
import { clientIp } from "../../../../lib/http/client-ip";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const result = await signIn({ email, password, ip: clientIp(request) });

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/signin?error=${result.error}`, request.url),
      { status: 303 },
    );
  }

  await setSessionCookie(result.value.token, result.value.expiresAt);

  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
