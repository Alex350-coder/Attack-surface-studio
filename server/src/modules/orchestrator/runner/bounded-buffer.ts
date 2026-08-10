/**
 * Caps how much stdout/stderr a single run can accumulate in memory (OWA-025: an adapter or a
 * misbehaving tool must never be able to OOM the worker process via unbounded output). Once the
 * cap is hit, further writes are silently dropped but a truncation marker is appended once.
 */
export class BoundedBuffer {
  private chunks: string[] = [];
  private bytes = 0;
  private truncated = false;

  constructor(private readonly maxBytes: number) {}

  write(chunk: string): void {
    if (this.truncated) return;

    // Measured/sliced by UTF-8 byte length, not JS string length, so the cap reflects the
    // actual memory/storage footprint of multi-byte (e.g. emoji, non-ASCII) tool output.
    const chunkBytes = Buffer.byteLength(chunk, "utf8");
    const remaining = this.maxBytes - this.bytes;
    if (chunkBytes <= remaining) {
      this.chunks.push(chunk);
      this.bytes += chunkBytes;
      return;
    }

    const fitted = Buffer.from(chunk, "utf8").subarray(0, Math.max(0, remaining)).toString("utf8");
    this.chunks.push(fitted);
    this.chunks.push("\n[truncated: output exceeded the maximum captured size]");
    this.truncated = true;
  }

  toString(): string {
    return this.chunks.join("");
  }
}
