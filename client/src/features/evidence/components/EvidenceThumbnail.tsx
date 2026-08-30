"use client";

import { useEffect, useState } from "react";
import { apiRequestBlob } from "@/lib/api-client";

type Props = {
  projectId: string;
  evidenceId: string;
  alt: string;
};

/**
 * Fetches an image evidence file's bytes via `apiRequestBlob` (Bearer-header auth, not a cookie a
 * plain `<img src>` could carry) and renders it from an object URL. Revokes the URL on unmount to
 * avoid leaking blob memory across the grid.
 */
export function EvidenceThumbnail({ projectId, evidenceId, alt }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    apiRequestBlob(`/projects/${projectId}/evidence/${evidenceId}/content`)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [projectId, evidenceId]);

  if (hasError) {
    return <div className="flex h-32 w-full items-center justify-center text-xs text-[var(--node-critical)]">Failed to load</div>;
  }
  if (!objectUrl) {
    return <div className="h-32 w-full animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-hover)]" />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- object URLs from `fetch` aren't compatible with next/image's remote loader.
  return <img src={objectUrl} alt={alt} className="h-32 w-full rounded-[var(--radius-md)] object-cover" />;
}
