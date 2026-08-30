"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EvidenceGrid } from "./EvidenceGrid";
import { EvidenceUploadDialog } from "./EvidenceUploadDialog";

type Props = {
  projectId: string;
};

/** Container: owns the upload-dialog open/closed state, renders the grid below it. */
export function EvidencePage({ projectId }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Evidence</h1>
        <Button type="button" size="sm" onClick={() => setIsDialogOpen(true)}>
          Upload evidence
        </Button>
      </div>
      <EvidenceGrid projectId={projectId} />
      {isDialogOpen ? <EvidenceUploadDialog projectId={projectId} onClose={() => setIsDialogOpen(false)} /> : null}
    </div>
  );
}
