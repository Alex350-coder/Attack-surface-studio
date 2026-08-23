import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BlobStorage, PutResult } from "./blob-storage.contract";

/** A ref is always `sha256/<aa>/<bb>/<64-hex-char-hash>` -- never accepted verbatim from a caller. */
const REF_PATTERN = /^sha256\/[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}$/;

/**
 * Stores blobs on the local filesystem, keyed by content hash rather than any caller-supplied
 * name (SEC-051-055): identical bytes always resolve to the same ref (free dedup), and refs are
 * unguessable/non-enumerable only in the sense that they reveal nothing about the original
 * filename or upload -- callers still need a `raw_outputs`/`evidence_files` row to look one up.
 */
export class LocalFilesystemBlobStorage implements BlobStorage {
  constructor(private readonly root: string) {}

  async put(bytes: Buffer): Promise<PutResult> {
    const hash = createHash("sha256").update(bytes).digest("hex");
    const ref = `sha256/${hash.slice(0, 2)}/${hash.slice(2, 4)}/${hash}`;
    const path = this.resolveRef(ref);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
      // Same content already stored under this hash -- nothing to do (idempotent write).
      if (error.code !== "EEXIST") throw error;
    });
    return { ref, hash, byteSize: bytes.byteLength };
  }

  async get(ref: string): Promise<Buffer> {
    return readFile(this.resolveRef(ref));
  }

  /** Rejects any ref that doesn't match the exact shape this class produces (path-traversal guard). */
  private resolveRef(ref: string): string {
    if (!REF_PATTERN.test(ref)) {
      throw new Error(`Invalid blob ref: ${ref}`);
    }
    return resolve(this.root, ref);
  }
}
