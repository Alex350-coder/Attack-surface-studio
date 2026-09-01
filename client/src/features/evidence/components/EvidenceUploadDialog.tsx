"use client";

import { useRef, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { useProjectGraph } from "@/features/workspace/api/use-project-graph";
import { useUploadEvidence } from "../api/use-upload-evidence";

type Props = {
  projectId: string;
  onClose: () => void;
};

/**
 * File input + optional node link (sourced from the already-fetched project graph, not a
 * separate query) + a label. The server independently re-validates the file's magic bytes
 * (SEC-030) -- this dialog's job is only to pick and describe the file, never to trust its
 * client-reported MIME type.
 */
export function EvidenceUploadDialog({ projectId, onClose }: Props) {
  const graphQuery = useProjectGraph(projectId);
  const uploadEvidence = useUploadEvidence(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nodeId, setNodeId] = useState("");
  const [label, setLabel] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setValidationError("Choose a file to upload.");
      return;
    }
    setValidationError(null);
    uploadEvidence.mutate(
      { file, nodeId: nodeId || undefined, label: label.trim() || undefined },
      { onSuccess: onClose },
    );
  }

  const nodeOptions = [
    { value: "", label: "None" },
    ...(graphQuery.data?.nodes.map((node) => ({ value: node.id, label: node.data.label })) ?? []),
  ];

  const errorMessage = validationError ?? (uploadEvidence.isError ? uploadEvidence.error.message : null);

  return (
    <Dialog title="Upload evidence" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="evidence-file" className="text-sm font-medium text-[var(--color-foreground-muted)]">
            File
          </label>
          <input
            id="evidence-file"
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="text-sm text-[var(--color-foreground)]"
          />
        </div>
        <Select
          id="evidence-node"
          label="Link to node (optional)"
          value={nodeId}
          onChange={setNodeId}
          options={nodeOptions}
          disabled={graphQuery.isLoading}
        />
        <TextField id="evidence-label" label="Label (optional)" value={label} onChange={setLabel} />
        {errorMessage ? (
          <p role="alert" className="text-sm text-[var(--node-critical)]">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={uploadEvidence.isPending}>
            {uploadEvidence.isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
