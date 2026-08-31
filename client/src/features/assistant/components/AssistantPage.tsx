"use client";

import { AssistantQueryPanel } from "./AssistantQueryPanel";
import { RecommendationList } from "./RecommendationList";

type Props = {
  projectId: string;
};

/** Top-level page composition, mirroring ReportsPage.tsx's two-section layout. */
export function AssistantPage({ projectId }: Props) {
  return (
    <div className="flex flex-col gap-8 p-6">
      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">AI Assistant</h1>
        <AssistantQueryPanel projectId={projectId} />
      </section>
      <section className="flex flex-col gap-4">
        <RecommendationList projectId={projectId} />
      </section>
    </div>
  );
}
