import { NextResponse, type NextRequest } from "next/server";

import { confirmPasswordReset } from "../../../../../features/accounts/password-reset";

/**
 * On success, sends the person to sign in with their new password rather
 * than signing them in directly — `confirmPasswordReset` has already
 * revoked every existing session, and this route has no raw session token
 * to set a cookie with (its `Result` only carries `userId`).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");

  const result = await confirmPasswordReset({ token, newPassword });

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(
        `/reset?token=${encodeURIComponent(token)}&error=${result.error}`,
        request.url,
      ),
      { status: 303 },
    );
  }

  return NextResponse.redirect(new URL("/signin?status=reset", request.url), {
    status: 303,
  });
}
