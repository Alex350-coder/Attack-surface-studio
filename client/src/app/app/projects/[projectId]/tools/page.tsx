import { notFound } from "next/navigation";
import { z } from "zod";
import { RunLauncher } from "@/features/runs/components/RunLauncher";
import { RunList } from "@/features/runs/components/RunList";

const projectIdSchema = z.string().uuid();

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectToolsPage({ params }: Props) {
  const { projectId } = await params;
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Run a tool</h1>
        <RunLauncher projectId={parsed.data} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Runs</h2>
        <RunList projectId={parsed.data} />
      </section>
    </div>
  );
}
