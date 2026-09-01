"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConfirmInsight } from "../api/use-confirm-insight";

type Props = {
  projectId: string;
  content: string;
  relatedNodeIds: string[];
  onClose: () => void;
  onConfirmed: () => void;
};

/**
 * Shows exactly what will be written to the graph before it happens -- the assistant never writes
 * anything without this explicit, human-reviewed confirmation step (no-autonomous-execution).
 */
export function InsightConfirmDialog({ projectId, content, relatedNodeIds, onClose, onConfirmed }: Props) {
  const confirmInsight = useConfirmInsight(projectId);

  function handleConfirm(): void {
    confirmInsight.mutate(
      { content, relatedNodeIds },
      {
        onSuccess: () => {
          onConfirmed();
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      title="Confirm as insight"
      description="This will add a new AI insight node and link it to the nodes below. Nothing else is executed."
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm text-[var(--color-foreground)]">
          {content}
        </p>
        <p className="text-xs text-[var(--color-foreground-muted)]">
          Will link to {relatedNodeIds.length} node{relatedNodeIds.length === 1 ? "" : "s"} already in this
          project&apos;s graph.
        </p>

        {confirmInsight.isError ? (
          <p role="alert" className="text-sm text-[var(--node-critical)]">
            {confirmInsight.error.message}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={confirmInsight.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={confirmInsight.isPending || relatedNodeIds.length === 0}
          >
            {confirmInsight.isPending ? "Confirming…" : "Confirm"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
