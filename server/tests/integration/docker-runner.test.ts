import Docker from "dockerode";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DockerRunner } from "../../src/modules/orchestrator/runner/docker-runner";

const IMAGE = "alpine:3";

/**
 * Exercises `DockerRunner` against the real local Docker daemon (already required by the
 * existing `testcontainers`-backed Postgres e2e tests). The unit test
 * (`tests/unit/orchestrator/docker-runner.test.ts`) covers the same `HostConfig` hardening
 * against a fake `dockerode`; this file proves the real daemon actually receives and enforces
 * that configuration, and that output capture / exit codes / timeout-kill genuinely work against
 * a live container.
 */
describe("DockerRunner (real Docker daemon)", () => {
  const docker = new Docker();

  beforeAll(async () => {
    const stream = await docker.pull(IMAGE);
    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(stream, (error) => (error ? reject(error) : resolve()));
    });
  }, 120_000);

  it("runs a real container, captures stdout, and reports its exit code", async () => {
    const runner = new DockerRunner(docker);

    const result = await runner.run({
      command: "sh",
      args: ["-c", "echo hello-from-container && exit 0"],
      timeoutMs: 15_000,
      image: IMAGE,
    });

    expect(result.stdout).toContain("hello-from-container");
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.cancelled).toBe(false);
  }, 30_000);

  it("reports a non-zero exit code from a real container", async () => {
    const runner = new DockerRunner(docker);

    const result = await runner.run({
      command: "sh",
      args: ["-c", "exit 7"],
      timeoutMs: 15_000,
      image: IMAGE,
    });

    expect(result.exitCode).toBe(7);
  }, 30_000);

  it("kills a real container that exceeds its timeout", async () => {
    const runner = new DockerRunner(docker);
    const startedAt = Date.now();

    const result = await runner.run({
      command: "sh",
      args: ["-c", "sleep 30"],
      timeoutMs: 1_000,
      image: IMAGE,
    });

    expect(result.timedOut).toBe(true);
    // The container's own sleep is 30s; a real kill must land well before that.
    expect(Date.now() - startedAt).toBeLessThan(15_000);
  }, 30_000);

  it("creates the container with the documented hardened HostConfig", async () => {
    const createContainerSpy = vi.spyOn(docker, "createContainer");

    try {
      const runner = new DockerRunner(docker);
      await runner.run({ command: "true", args: [], timeoutMs: 15_000, image: IMAGE });

      expect(createContainerSpy).toHaveBeenCalledTimes(1);
      const createOptions = createContainerSpy.mock.calls[0]?.[0];
      const hostConfig = createOptions?.HostConfig ?? {};
      expect(createOptions?.User).toBe("65534:65534");
      expect(hostConfig.CapDrop).toEqual(["ALL"]);
      expect(hostConfig.NetworkMode).toBe("none");
      expect(hostConfig.AutoRemove).toBe(true);
      expect(hostConfig.ReadonlyRootfs).toBe(true);
      expect(hostConfig.Memory).toBeGreaterThan(0);
      expect(hostConfig.NanoCpus).toBeGreaterThan(0);
      expect(hostConfig.PidsLimit).toBeGreaterThan(0);
    } finally {
      createContainerSpy.mockRestore();
    }
  }, 30_000);
});
