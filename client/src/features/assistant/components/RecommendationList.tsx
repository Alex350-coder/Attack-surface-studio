"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAssistantRecommend } from "../api/use-assistant-recommend";
import { InsightConfirmDialog } from "./InsightConfirmDialog";

/** Server DTO caps relatedNodeIds at 20 -- mirrored here so the confirm dialog never sends more
 * than the backend will accept. */
const MAX_RELATED_NODE_IDS = 20;

type Props = {
  projectId: string;
};

/**
 * Requests next-step recommendations and offers "Confirm as insight" -- never "run" or "execute".
 * Confirming only ever writes a graph node/edges; it cannot trigger a tool.
 */
export function RecommendationList({ projectId }: Props) {
  const assistantRecommend = useAssistantRecommend(projectId);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const errorMessage = assistantRecommend.isError ? assistantRecommend.error.message : null;
  const relatedNodeIds = (assistantRecommend.data?.referencedNodeIds ?? []).slice(0, MAX_RELATED_NODE_IDS);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recommendations</h2>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={assistantRecommend.isPending}
          onClick={() => assistantRecommend.mutate({})}
        >
          {assistantRecommend.isPending ? "Thinking…" : "Get recommendations"}
        </Button>
      </div>

      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--node-critical)]">
          {errorMessage}
        </p>
      ) : null}

      {assistantRecommend.data ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
          <p className="whitespace-pre-wrap text-sm text-[var(--color-foreground)]">{assistantRecommend.data.answer}</p>
          <Button
            type="button"
            size="sm"
            disabled={relatedNodeIds.length === 0}
            onClick={() => setIsConfirmOpen(true)}
            className="self-start"
          >
            Confirm as insight
          </Button>
        </div>
      ) : null}

      {isConfirmOpen && assistantRecommend.data ? (
        <InsightConfirmDialog
          projectId={projectId}
          content={assistantRecommend.data.answer}
          relatedNodeIds={relatedNodeIds}
          onClose={() => setIsConfirmOpen(false)}
          onConfirmed={() => setIsConfirmOpen(false)}
        />
      ) : null}
    </div>
  );
}
