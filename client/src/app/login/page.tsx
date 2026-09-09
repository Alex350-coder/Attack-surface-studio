import Link from "next/link";
import type { Metadata } from "next";
import { Radar } from "lucide-react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { BackgroundLayer } from "@/components/effects/BackgroundLayer";

export const metadata: Metadata = {
  title: "Sign in — Attack Surface Studio",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center bg-[var(--color-background)] px-6">
      <BackgroundLayer />
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-8">
        <Link href="/" className="flex items-center justify-center gap-2 text-[var(--color-foreground)]">
          <Radar size={20} strokeWidth={2} className="text-[var(--color-accent-strong)]" />
          <span className="text-sm font-semibold tracking-tight">Attack Surface Studio</span>
        </Link>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[0_0_40px_-12px_var(--glow-primary)]">
          <div className="flex flex-col gap-2 pb-6 text-center">
            <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Sign in</h1>
            <p className="text-sm text-[var(--color-foreground-muted)]">Access your Attack Surface Studio workspace.</p>
          </div>
          <LoginForm />
        </div>
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
