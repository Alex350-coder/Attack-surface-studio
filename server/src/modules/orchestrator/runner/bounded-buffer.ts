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

    const remaining = this.maxBytes - this.bytes;
    if (chunk.length <= remaining) {
      this.chunks.push(chunk);
      this.bytes += chunk.length;
      return;
    }

    this.chunks.push(chunk.slice(0, Math.max(0, remaining)));
    this.chunks.push("\n[truncated: output exceeded the maximum captured size]");
    this.truncated = true;
  }

  toString(): string {
    return this.chunks.join("");
  }
}
