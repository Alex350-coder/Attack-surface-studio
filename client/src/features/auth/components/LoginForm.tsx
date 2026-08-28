"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useLogin } from "../auth.api";
import { AuthField } from "./AuthField";

// UX-only mirror of server/src/modules/auth/dto/auth.dto.ts's loginSchema -- the backend
// re-validates and remains authoritative (FE-006).
const loginFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }
    setValidationError(null);
    login.mutate(parsed.data, { onSuccess: () => router.push("/app") });
  }

  const errorMessage = validationError ?? (login.isError ? login.error.message : null);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-4">
      <AuthField id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
      <AuthField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--node-critical)]">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={login.isPending} className="mt-2">
        {login.isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
