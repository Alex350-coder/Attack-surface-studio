import type { ReactNode } from "react";
import { WorkspaceShell } from "@/features/workspace/components/WorkspaceShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
