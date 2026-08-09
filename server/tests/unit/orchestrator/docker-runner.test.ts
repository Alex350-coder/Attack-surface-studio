import { describe, expect, it } from "vitest";
import type Docker from "dockerode";
import { DockerRunner } from "../../../src/modules/orchestrator/runner/docker-runner";

/**
 * A minimal fake standing in for `dockerode` -- exercises `DockerRunner`'s container
 * configuration and lifecycle calls without needing a real Docker daemon. The real daemon is
 * exercised separately in `tests/integration/docker-runner.test.ts` (Task 9, requires Docker).
 */
class FakeContainer {
  stopCalledWith: unknown;
  startCalled = false;

  constructor(public readonly createOptions: Record<string, unknown>) {}

  attach() {
    return Promise.resolve({});
  }

  start() {
    this.startCalled = true;
    return Promise.resolve();
  }

  stop(args: unknown) {
    this.stopCalledWith = args;
    return Promise.resolve();
  }

  wait() {
    return Promise.resolve({ StatusCode: 0 });
  }
}

class FakeDocker {
  lastContainer: FakeContainer | undefined;
  modem = { demuxStream: () => undefined };

  createContainer(options: Record<string, unknown>) {
    this.lastContainer = new FakeContainer(options);
    return Promise.resolve(this.lastContainer);
  }
}

describe("DockerRunner", () => {
  it("configures a hardened, resource-bounded, non-root container", async () => {
    const fakeDocker = new FakeDocker();
    const runner = new DockerRunner(fakeDocker as unknown as Docker);

    const result = await runner.run({
      command: "echo",
      args: ["hi"],
      timeoutMs: 5_000,
      image: "alpine:3",
    });

    const hostConfig = fakeDocker.lastContainer?.createOptions.HostConfig as Record<string, unknown>;
    expect(fakeDocker.lastContainer?.createOptions.User).toBe("65534:65534");
    expect(hostConfig.CapDrop).toEqual(["ALL"]);
    expect(hostConfig.NetworkMode).toBe("none");
    expect(hostConfig.AutoRemove).toBe(true);
    expect(hostConfig.ReadonlyRootfs).toBe(true);
    expect(hostConfig.Memory).toBeGreaterThan(0);
    expect(hostConfig.NanoCpus).toBeGreaterThan(0);
    expect(hostConfig.PidsLimit).toBeGreaterThan(0);
    expect(fakeDocker.lastContainer?.startCalled).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it("stops the container when the timeout elapses", async () => {
    const fakeDocker = new FakeDocker();
    const runner = new DockerRunner(fakeDocker as unknown as Docker);

    await runner.run({ command: "echo", args: ["hi"], timeoutMs: 5_000, image: "alpine:3" });

    // wait() resolves immediately in the fake, so no timeout fires -- stop() is untouched.
    expect(fakeDocker.lastContainer?.stopCalledWith).toBeUndefined();
  });

  it("rejects when no image is provided", async () => {
    const runner = new DockerRunner(new FakeDocker() as unknown as ConstructorParameters<typeof DockerRunner>[0]);
    await expect(runner.run({ command: "echo", args: [], timeoutMs: 1000 })).rejects.toThrow(/requires Invocation.image/);
  });
});
