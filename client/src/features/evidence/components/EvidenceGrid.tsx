"use client";

import { FileText } from "lucide-react";
import { apiRequestBlob } from "@/lib/api-client";
import { useEvidence } from "../api/use-evidence";
import { EvidenceThumbnail } from "./EvidenceThumbnail";

type Props = {
  projectId: string;
};

async function downloadEvidence(projectId: string, evidenceId: string, fileName: string): Promise<void> {
  const blob = await apiRequestBlob(`/projects/${projectId}/evidence/${evidenceId}/content`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Thumbnails for images (via the evidence-content endpoint), a generic file icon otherwise (FE-017). */
export function EvidenceGrid({ projectId }: Props) {
  const evidenceQuery = useEvidence(projectId);

  if (evidenceQuery.isLoading) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Loading evidence…</p>;
  }
  if (evidenceQuery.isError) {
    return <p role="alert" className="text-sm text-[var(--node-critical)]">Failed to load evidence.</p>;
  }
  if (!evidenceQuery.data || evidenceQuery.data.length === 0) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">No evidence uploaded yet.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {evidenceQuery.data.map((evidence) => (
        <li key={evidence.id} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
          {evidence.mimeType.startsWith("image/") ? (
            <EvidenceThumbnail
              projectId={projectId}
              evidenceId={evidence.id}
              alt={evidence.label ?? "Evidence image"}
            />
          ) : (
            <button
              type="button"
              onClick={() => void downloadEvidence(projectId, evidence.id, evidence.label ?? evidence.id)}
              className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-hover)] text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
            >
              <FileText size={28} aria-hidden />
              <span className="text-xs">{evidence.mimeType}</span>
            </button>
          )}
          <span className="truncate text-xs text-[var(--color-foreground-muted)]">
            {evidence.label ?? "Untitled"}
          </span>
        </li>
      ))}
    </ul>
  );
}
