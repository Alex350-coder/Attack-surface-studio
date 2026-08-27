import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuthUser } from "@/features/auth/auth.store";
import { backendRequest } from "@/lib/backend-client";
import { setRefreshTokenCookie } from "@/lib/auth-cookies";

const loginBodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

interface AuthResultBody {
  user: AuthUser;
  tokens: { accessToken: string; refreshToken: string };
}

/**
 * BFF login endpoint. Proxies to the backend, then splits the token pair: the refresh token
 * is written to an httpOnly cookie here (the only place it is ever readable, SEC-035) and never
 * included in the JSON body -- only `{ user, accessToken }` reaches browser JS.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = loginBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: "Enter a valid email and password.", code: "VALIDATION_ERROR", correlationId: "" } },
      { status: 400 },
    );
  }

  const { status, envelope } = await backendRequest<AuthResultBody>("/auth/login", { body: parsed.data });
  if (!envelope.success) {
    return NextResponse.json(envelope, { status });
  }

  const response = NextResponse.json({
    success: true,
    data: { user: envelope.data.user, accessToken: envelope.data.tokens.accessToken },
  });
  setRefreshTokenCookie(response, envelope.data.tokens.refreshToken);
  return response;
}
