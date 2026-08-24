import "dotenv/config";
import { mkdirSync } from "node:fs";
import { Global, Module } from "@nestjs/common";
import { LocalFilesystemBlobStorage } from "./local-filesystem-blob-storage";
import { BLOB_STORAGE } from "./storage.tokens";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Exposes a `BlobStorage` provider (mirrors `DatabaseModule`/`QueueModule`'s DI shape). Local
 * filesystem today; swapping in an S3/MinIO-backed implementation later is a one-provider change
 * here, not a caller-facing one (ARCHITECTURE.md ADR-014).
 */
@Global()
@Module({
  providers: [
    {
      provide: BLOB_STORAGE,
      useFactory: () => {
        const root = requireEnv("STORAGE_ROOT");
        mkdirSync(root, { recursive: true });
        return new LocalFilesystemBlobStorage(root);
      },
    },
  ],
  exports: [BLOB_STORAGE],
})
export class StorageModule {}
