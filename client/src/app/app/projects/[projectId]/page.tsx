import { notFound } from "next/navigation";
import { z } from "zod";
import { WorkspaceGraphView } from "@/features/workspace/graph/WorkspaceGraphView";

const projectIdSchema = z.string().uuid();

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectGraphPage({ params }: Props) {
  const { projectId } = await params;
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) {
    notFound();
  }

  return <WorkspaceGraphView projectId={parsed.data} />;
}
