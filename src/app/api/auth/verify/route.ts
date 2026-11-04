import { NextResponse, type NextRequest } from "next/server";

import { consumeVerificationToken } from "../../../../features/accounts/verification";

/**
 * This is the URL the verification email links to. It performs the one
 * mutating step (consuming the token) and immediately redirects to the
 * human-facing `/verify` page with only a `status` flag — never the token
 * itself — so that page can stay a pure, side-effect-free display of
 * plain-language success or failure (NFR-5.8).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await consumeVerificationToken(token);
  const status = result.ok ? "verified" : "invalid";

  return NextResponse.redirect(new URL(`/verify?status=${status}`, request.url), {
    status: 303,
  });
}
