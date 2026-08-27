import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "Create account — Attack Surface Studio",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[var(--color-background)] px-6">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Create your account</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">Start mapping your attack surface.</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-[var(--color-foreground-subtle)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
