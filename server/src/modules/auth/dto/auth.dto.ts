import { z } from "zod";

/** Mirrors common password-strength guidance (SEC-001) without being so strict it blocks password managers. */
const passwordSchema = z
  .string()
  .min(12, "password must be at least 12 characters")
  .max(256, "password must be at most 256 characters");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("must be a valid email address"),
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(120).optional(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("must be a valid email address"),
  password: z.string().min(1, "password is required"),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});
export type RefreshDto = z.infer<typeof refreshSchema>;

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});
export type LogoutDto = z.infer<typeof logoutSchema>;
