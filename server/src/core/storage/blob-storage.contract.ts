/**
 * Content-addressable blob storage for bytes that don't belong in Postgres (raw tool output,
 * evidence files -- DATA_MODEL.md `raw_outputs.content_ref` / `evidence_files.file_ref`).
 * Implementations are swappable (local filesystem today, S3/MinIO later) without touching any
 * caller, since every caller only ever depends on this interface (ARC-012-style extensibility).
 */
export interface PutResult {
  /** Opaque, storage-implementation-specific reference. Never a user-supplied filename. */
  ref: string;
  /** SHA-256 hex digest of the stored bytes. */
  hash: string;
  byteSize: number;
}

export interface BlobStorage {
  put(bytes: Buffer): Promise<PutResult>;
  get(ref: string): Promise<Buffer>;
}
