/**
 * Deterministic, harmless "tool" used only to exercise the Orchestrator end-to-end
 * (Plan.md Phase 6 acceptance criteria: "via a stub adapter"). Not a security tool -- it never
 * touches the network. Spawned by the shared process runner exactly like a real adapter would
 * spawn a real binary, so it proves the full spawn/timeout/cancel/capture pipeline.
 *
 * Usage: node stub.script.js --target <value> --delay-ms <value>
 */
function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const target = readArg("--target") ?? "unknown";
const delayMs = Number(readArg("--delay-ms") ?? "0");

setTimeout(() => {
  process.stdout.write(
    `${JSON.stringify({
      tool: "stub",
      target,
      status: "ok",
      findings: [{ id: `stub-finding-${target}`, message: `stub scan of ${target} completed` }],
    })}\n`,
  );
}, delayMs);
