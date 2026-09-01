import { notFound } from "next/navigation";
import { z } from "zod";
import { AssistantPage } from "@/features/assistant/components/AssistantPage";

const projectIdSchema = z.string().uuid();

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectAssistantPage({ params }: Props) {
  const { projectId } = await params;
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) {
    notFound();
  }

  return <AssistantPage projectId={parsed.data} />;
}
