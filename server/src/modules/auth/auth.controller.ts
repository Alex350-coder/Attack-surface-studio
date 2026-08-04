import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { ZodValidationPipe } from "../../core/validation/zod-validation.pipe";
import { UnauthorizedError } from "../../core/http/domain-error";
import { AuthService, type AuthenticatedUser, type AuthResult, type TokenPair } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { loginSchema, logoutSchema, refreshSchema, registerSchema, type LoginDto, type LogoutDto, type RefreshDto, type RegisterDto } from "./dto/auth.dto";

const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Throttle(AUTH_THROTTLE)
  async register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterDto): Promise<AuthResult> {
    return this.authService.register(body);
  }

  @Post("login")
  @Throttle(AUTH_THROTTLE)
  async login(@Body(new ZodValidationPipe(loginSchema)) body: LoginDto): Promise<AuthResult> {
    return this.authService.login(body);
  }

  @Post("refresh")
  @Throttle(AUTH_THROTTLE)
  async refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshDto): Promise<TokenPair> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  async logout(@Body(new ZodValidationPipe(logoutSchema)) body: LogoutDto): Promise<{ success: true }> {
    await this.authService.logout(body.refreshToken);
    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: Request): Promise<AuthenticatedUser> {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedError("Authentication is required");
    }
    const user = await this.authService.getById(userId);
    if (!user) {
      throw new UnauthorizedError("User no longer exists");
    }
    return user;
  }
}
