"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUpload } from "@/lib/api-client";
import { evidenceFileSchema } from "./use-evidence";

interface UploadEvidenceInput {
  file: File;
  nodeId?: string;
  label?: string;
}

export function useUploadEvidence(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, nodeId, label }: UploadEvidenceInput) => {
      const formData = new FormData();
      formData.append("file", file);
      if (nodeId) formData.append("nodeId", nodeId);
      if (label) formData.append("label", label);

      const data = await apiUpload<unknown>(`/projects/${projectId}/evidence`, formData);
      return evidenceFileSchema.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "evidence"] });
    },
  });
}
