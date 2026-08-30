import { notFound } from "next/navigation";
import { z } from "zod";
import { ReportsPage } from "@/features/reports/components/ReportsPage";

const projectIdSchema = z.string().uuid();

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectReportsPage({ params }: Props) {
  const { projectId } = await params;
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) {
    notFound();
  }

  return <ReportsPage projectId={parsed.data} />;
}
