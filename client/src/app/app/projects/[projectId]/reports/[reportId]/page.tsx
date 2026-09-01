import { notFound } from "next/navigation";
import { z } from "zod";
import { ReportPreview } from "@/features/reports/components/ReportPreview";

const paramsSchema = z.object({ projectId: z.string().uuid(), reportId: z.string().uuid() });

type Props = {
  params: Promise<{ projectId: string; reportId: string }>;
};

export default async function ReportDetailPage({ params }: Props) {
  const resolved = await params;
  const parsed = paramsSchema.safeParse(resolved);
  if (!parsed.success) {
    notFound();
  }

  return (
    <div className="p-6">
      <ReportPreview projectId={parsed.data.projectId} reportId={parsed.data.reportId} />
    </div>
  );
}
