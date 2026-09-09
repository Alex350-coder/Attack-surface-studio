import Link from "next/link";
import type { Metadata } from "next";
import { Radar } from "lucide-react";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { BackgroundLayer } from "@/components/effects/BackgroundLayer";

export const metadata: Metadata = {
  title: "Create account — Attack Surface Studio",
};

export default function RegisterPage() {
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
            <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Create your account</h1>
            <p className="text-sm text-[var(--color-foreground-muted)]">Start mapping your attack surface.</p>
          </div>
          <RegisterForm />
        </div>
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
