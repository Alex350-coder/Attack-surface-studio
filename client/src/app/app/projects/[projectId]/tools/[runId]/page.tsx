import { notFound } from "next/navigation";
import { z } from "zod";
import { RunDetail } from "@/features/runs/components/RunDetail";

const paramsSchema = z.object({ projectId: z.string().uuid(), runId: z.string().uuid() });

type Props = {
  params: Promise<{ projectId: string; runId: string }>;
};

export default async function RunDetailPage({ params }: Props) {
  const resolved = await params;
  const parsed = paramsSchema.safeParse(resolved);
  if (!parsed.success) {
    notFound();
  }

  return (
    <div className="p-6">
      <RunDetail projectId={parsed.data.projectId} runId={parsed.data.runId} />
    </div>
  );
}
