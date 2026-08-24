import { z } from "zod";

/** Multipart form fields alongside the uploaded file; the file itself is handled by multer. */
export const evidenceUploadFieldsSchema = z.object({
  nodeId: z.string().uuid().optional(),
  label: z.string().min(1).optional(),
});
export type EvidenceUploadFieldsDto = z.infer<typeof evidenceUploadFieldsSchema>;

/**
 * Magic-byte-sniffed MIME types accepted for evidence uploads (never trust the client
 * Content-Type header, SEC-051/OWA-024). Limited to formats `file-type` can actually detect from
 * a byte signature -- plain text has none, so it is deliberately excluded.
 */
export const ALLOWED_EVIDENCE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;

export const MAX_EVIDENCE_FILE_BYTES = 25 * 1024 * 1024;
