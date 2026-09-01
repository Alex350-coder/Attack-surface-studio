import { notFound } from "next/navigation";
import { z } from "zod";
import { SettingsPage } from "@/features/settings/components/SettingsPage";

const projectIdSchema = z.string().uuid();

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectSettingsPage({ params }: Props) {
  const { projectId } = await params;
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) {
    notFound();
  }

  return <SettingsPage projectId={parsed.data} />;
}
