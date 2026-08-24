import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalFilesystemBlobStorage } from "../../../src/core/storage/local-filesystem-blob-storage";

describe("LocalFilesystemBlobStorage", () => {
  let root: string;
  let storage: LocalFilesystemBlobStorage;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "blob-storage-test-"));
    storage = new LocalFilesystemBlobStorage(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("stores bytes and returns a content-addressed ref/hash", async () => {
    const bytes = Buffer.from("hello world");
    const result = await storage.put(bytes);

    expect(result.hash).toHaveLength(64);
    expect(result.ref).toBe(`sha256/${result.hash.slice(0, 2)}/${result.hash.slice(2, 4)}/${result.hash}`);
    expect(result.byteSize).toBe(bytes.byteLength);
  });

  it("round-trips stored bytes via get()", async () => {
    const bytes = Buffer.from("round trip me");
    const { ref } = await storage.put(bytes);

    expect(await storage.get(ref)).toEqual(bytes);
  });

  it("dedupes identical content to the same ref (idempotent write)", async () => {
    const bytes = Buffer.from("duplicate content");
    const first = await storage.put(bytes);
    const second = await storage.put(bytes);

    expect(second.ref).toBe(first.ref);
    expect(await storage.get(second.ref)).toEqual(bytes);
  });

  it("rejects a ref that doesn't match the content-addressed shape (path-traversal guard)", async () => {
    await expect(storage.get("../../etc/passwd")).rejects.toThrow(/Invalid blob ref/);
    await expect(storage.get("sha256/../../secret")).rejects.toThrow(/Invalid blob ref/);
  });
});
