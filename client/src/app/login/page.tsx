import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Attack Surface Studio",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[var(--color-background)] px-6">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Sign in</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">Access your Attack Surface Studio workspace.</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-[var(--color-foreground-subtle)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[var(--color-accent)] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
