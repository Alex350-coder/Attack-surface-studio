import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";
import { ProjectSubNav } from "@/features/workspace/components/ProjectSubNav";

const projectIdSchema = z.string().uuid();

type Props = {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
};

export default async function ProjectLayout({ children, params }: Props) {
  const { projectId } = await params;
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) {
    notFound();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProjectSubNav projectId={parsed.data} />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
    </div>
  );
}
