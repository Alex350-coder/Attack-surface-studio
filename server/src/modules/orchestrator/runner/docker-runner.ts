import { PassThrough } from "node:stream";
import { Logger } from "@nestjs/common";
import Docker from "dockerode";
import { BoundedBuffer } from "./bounded-buffer";
import type { Runner, RunnerOptions, RunResult } from "./runner.contract";

const logger = new Logger("DockerRunner");

const MAX_CAPTURED_BYTES = 5 * 1024 * 1024;
const STOP_GRACE_SECONDS = 5;

export interface DockerRunnerLimits {
  memoryBytes?: number;
  nanoCpus?: number;
  pidsLimit?: number;
}

const DEFAULT_LIMITS: Required<DockerRunnerLimits> = {
  memoryBytes: 512 * 1024 * 1024,
  nanoCpus: 1_000_000_000, // 1 vCPU
  pidsLimit: 128,
};

/**
 * Docker execution mode: runs a tool in an isolated, resource-bounded, non-root container
 * (`EXE-006`, `EXE-007`, SECURITY_MODEL.md -- the Docker daemon is a privileged surface).
 * No outbound network by default, all Linux capabilities dropped, read-only root filesystem,
 * and the container is auto-removed once it exits.
 */
export class DockerRunner implements Runner {
  constructor(
    private readonly docker: Docker = new Docker(),
    private readonly limits: DockerRunnerLimits = {},
  ) {}

  async run(options: RunnerOptions): Promise<RunResult> {
    if (!options.image) {
      throw new Error("DockerRunner requires Invocation.image to be set");
    }
    const limits = { ...DEFAULT_LIMITS, ...this.limits };

    const container = await this.docker.createContainer({
      Image: options.image,
      Cmd: [options.command, ...options.args],
      Env: options.env ? Object.entries(options.env).map(([key, value]) => `${key}=${value}`) : undefined,
      Tty: false,
      User: "65534:65534", // nobody:nogroup -- never run tool containers as root
      HostConfig: {
        AutoRemove: true,
        NetworkMode: "none",
        CapDrop: ["ALL"],
        SecurityOpt: ["no-new-privileges"],
        ReadonlyRootfs: true,
        Memory: limits.memoryBytes,
        NanoCpus: limits.nanoCpus,
        PidsLimit: limits.pidsLimit,
      },
    });

    const stdout = new BoundedBuffer(MAX_CAPTURED_BYTES);
    const stderr = new BoundedBuffer(MAX_CAPTURED_BYTES);
    let timedOut = false;
    let cancelled = false;

    const attachedStream = await container.attach({ stream: true, stdout: true, stderr: true });
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();
    stdoutStream.on("data", (chunk: Buffer) => stdout.write(chunk.toString("utf8")));
    stderrStream.on("data", (chunk: Buffer) => stderr.write(chunk.toString("utf8")));
    this.docker.modem.demuxStream(attachedStream, stdoutStream, stderrStream);

    await container.start();

    const stopContainer = () => {
      container.stop({ t: STOP_GRACE_SECONDS }).catch((error: unknown) => {
        // 304 ("container already stopped") is an expected race with the tool exiting on its
        // own -- anything else means the graceful stop failed and we must force-kill so the
        // container can never outlive the run (EXE-006/EXE-007: no orphaned tool containers).
        const statusCode = (error as { statusCode?: number } | undefined)?.statusCode;
        if (statusCode === 304) return;
        logger.warn(`container.stop() failed, forcing kill: ${String(error)}`);
        container.kill().catch((killError: unknown) => {
          logger.error(`container.kill() also failed -- container may be orphaned: ${String(killError)}`);
        });
      });
    };
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      stopContainer();
    }, options.timeoutMs);
    const onAbort = () => {
      cancelled = true;
      stopContainer();
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const waitResult = (await container.wait()) as { StatusCode: number };
      return {
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: waitResult.StatusCode,
        timedOut,
        cancelled,
      };
    } finally {
      clearTimeout(timeoutHandle);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }
}
