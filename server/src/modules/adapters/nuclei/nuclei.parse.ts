import { z } from "zod";
import { UnparseableOutputError, type ParsedResult, type RawOutputRef } from "../adapter.contract";

const nucleiMatchSchema = z.object({
  "template-id": z.string().min(1),
  info: z.object({
    name: z.string().min(1),
    severity: z.string().min(1),
  }),
  host: z.string().min(1),
  "matched-at": z.string().min(1),
});

export interface NucleiParsedMatch {
  templateId: string;
  name: string;
  severity: string;
  host: string;
  matchedAt: string;
}

export type NucleiParsedOutput = NucleiParsedMatch[];

/**
 * Parses Nuclei's `-jsonl` output: one JSON object per line. Per EXE-013, a malformed line
 * doesn't discard the rest of an otherwise-valid stream -- each line is parsed independently and
 * invalid ones are skipped. Only an entirely-unparseable, non-empty stream (zero valid matches)
 * throws `UnparseableOutputError`. Must be `async` (not just Promise-returning) so that throw is
 * a rejected promise, matching the `ToolAdapter` contract.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function parseNucleiOutput(raw: RawOutputRef): Promise<ParsedResult> {
  const lines = raw.stdout.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }

  const matches: NucleiParsedMatch[] = [];
  for (const line of lines) {
    let candidate: unknown;
    try {
      candidate = JSON.parse(line);
    } catch {
      continue;
    }
    const result = nucleiMatchSchema.safeParse(candidate);
    if (!result.success) continue;

    matches.push({
      templateId: result.data["template-id"],
      name: result.data.info.name,
      severity: result.data.info.severity,
      host: result.data.host,
      matchedAt: result.data["matched-at"],
    });
  }

  if (matches.length === 0) {
    throw new UnparseableOutputError("Nuclei JSONL output contained no valid match lines");
  }

  return matches;
}
