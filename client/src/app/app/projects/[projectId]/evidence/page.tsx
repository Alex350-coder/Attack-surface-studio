import { notFound } from "next/navigation";
import { z } from "zod";
import { EvidencePage } from "@/features/evidence/components/EvidencePage";

const projectIdSchema = z.string().uuid();

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectEvidencePage({ params }: Props) {
  const { projectId } = await params;
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) {
    notFound();
  }

  return <EvidencePage projectId={parsed.data} />;
}
