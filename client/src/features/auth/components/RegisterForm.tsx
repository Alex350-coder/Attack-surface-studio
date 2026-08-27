"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useRegister } from "../auth.api";
import { AuthField } from "./AuthField";

// UX-only mirror of server/src/modules/auth/dto/auth.dto.ts's registerSchema -- the backend
// re-validates and remains authoritative (FE-006).
const registerFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(12, "Password must be at least 12 characters."),
  displayName: z.string().trim().min(1).max(120).optional(),
});

export function RegisterForm() {
  const router = useRouter();
  const register = useRegister();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = registerFormSchema.safeParse({
      email,
      password,
      displayName: displayName.trim().length > 0 ? displayName : undefined,
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }
    setValidationError(null);
    register.mutate(parsed.data, { onSuccess: () => router.push("/app") });
  }

  const errorMessage = validationError ?? (register.isError ? register.error.message : null);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-4">
      <AuthField id="displayName" label="Name (optional)" type="text" autoComplete="name" value={displayName} onChange={setDisplayName} />
      <AuthField id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
      <AuthField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--node-critical)]">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={register.isPending} className="mt-2">
        {register.isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
