import { NextResponse, type NextRequest } from "next/server";

import { requestPasswordReset } from "../../../../../features/accounts/password-reset";
import { clientIp } from "../../../../../lib/http/client-ip";

/**
 * Always redirects to the same destination regardless of whether the
 * submitted address has an account — `requestPasswordReset` returns
 * `void` for exactly this reason, so there is nothing here that could
 * vary the response by address.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");

  await requestPasswordReset({ email, ip: clientIp(request) });

  return NextResponse.redirect(new URL("/reset?status=sent", request.url), {
    status: 303,
  });
}
