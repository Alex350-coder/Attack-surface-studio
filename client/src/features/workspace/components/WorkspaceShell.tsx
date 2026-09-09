"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Radar } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthUser } from "@/features/auth/auth.store";
import { useLogout } from "@/features/auth/auth.api";
import { useBootstrapSession } from "@/features/auth/use-bootstrap-session";
import { Button } from "@/components/ui/button";
import { BackgroundLayer } from "@/components/effects/BackgroundLayer";
import { ProjectSwitcher } from "./ProjectSwitcher";

type Props = {
  children: ReactNode;
};

/**
 * Top-level shell for the authed /app tree. Blocks on useBootstrapSession() so no child ever
 * renders with a stale/absent in-memory access token after a hard reload (FE-005).
 */
export function WorkspaceShell({ children }: Props) {
  const { isReady } = useBootstrapSession();
  const user = useAuthUser();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  const activeProjectId = useMemo(() => {
    const match = pathname.match(/^\/app\/projects\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  function handleLogout(): void {
    logout.mutate(undefined, { onSuccess: () => router.replace("/login") });
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <p className="text-sm text-[var(--color-foreground-muted)]">Loading your workspace…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--color-background)]">
      {/* Same shared effect as the Hero/login/register (FE-012 lineage). Kept subtle here: the
       * header gets a frosted backdrop and page content keeps its own solid surfaces (project
       * cards, the graph canvas card) so the animation reads as ambient texture, not clutter. */}
      <BackgroundLayer />
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-background)]/70 px-6 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <Link href="/app" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
            <Radar size={20} strokeWidth={2} className="text-[var(--color-accent-strong)]" />
            Attack Surface Studio
          </Link>
          <ProjectSwitcher activeProjectId={activeProjectId} />
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <span className="text-sm text-[var(--color-foreground-muted)]">{user.displayName ?? user.email}</span>
          ) : null}
          <Button variant="ghost" size="sm" onClick={handleLogout} disabled={logout.isPending}>
            {logout.isPending ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </header>
      <main className="relative z-10 flex flex-1 flex-col">{children}</main>
    </div>
  );
}
