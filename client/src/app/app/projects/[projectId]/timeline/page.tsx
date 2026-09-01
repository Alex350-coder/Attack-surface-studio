import { notFound } from "next/navigation";
import { z } from "zod";
import { TimelineView } from "@/features/timeline/components/TimelineView";

const projectIdSchema = z.string().uuid();

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectTimelinePage({ params }: Props) {
  const { projectId } = await params;
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) {
    notFound();
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Timeline</h1>
      <TimelineView projectId={parsed.data} />
    </div>
  );
}
