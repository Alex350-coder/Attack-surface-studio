import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuthUser } from "@/features/auth/auth.store";
import { backendRequest } from "@/lib/backend-client";
import { setRefreshTokenCookie } from "@/lib/auth-cookies";

// Mirrors server/src/modules/auth/dto/auth.dto.ts's registerSchema (FE-006 UX-only validation
// -- the backend re-validates and remains authoritative).
const registerBodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12).max(256),
  displayName: z.string().trim().min(1).max(120).optional(),
});

interface AuthResultBody {
  user: AuthUser;
  tokens: { accessToken: string; refreshToken: string };
}

/** BFF register endpoint. Same token-splitting behavior as /api/auth/login (SEC-035). */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = registerBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Check your email and password (min 12 characters).", code: "VALIDATION_ERROR", correlationId: "" },
      },
      { status: 400 },
    );
  }

  const { status, envelope } = await backendRequest<AuthResultBody>("/auth/register", { body: parsed.data });
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
