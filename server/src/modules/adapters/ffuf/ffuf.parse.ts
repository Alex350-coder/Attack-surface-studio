import { z } from "zod";
import { UnparseableOutputError, type ParsedResult, type RawOutputRef } from "../adapter.contract";

const ffufResultSchema = z.object({
  url: z.string().min(1),
  host: z.string().min(1),
  status: z.number().int(),
  length: z.number().int().nonnegative(),
  words: z.number().int().nonnegative(),
  lines: z.number().int().nonnegative(),
});

const ffufDocumentSchema = z.object({
  results: z.array(ffufResultSchema),
});

export interface FfufParsedResult {
  url: string;
  host: string;
  status: number;
  length: number;
  words: number;
  lines: number;
}

export type FfufParsedOutput = FfufParsedResult[];

/**
 * Parses ffuf's `-of json` output (a single JSON document with a `results` array). Must be
 * `async` (not just Promise-returning) so the throw below is a rejected promise, matching the
 * `ToolAdapter` contract.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function parseFfufOutput(raw: RawOutputRef): Promise<ParsedResult> {
  let document: unknown;
  try {
    document = JSON.parse(raw.stdout);
  } catch (error) {
    throw new UnparseableOutputError(`ffuf output is not valid JSON: ${(error as Error).message}`);
  }

  const result = ffufDocumentSchema.safeParse(document);
  if (!result.success) {
    throw new UnparseableOutputError(`ffuf JSON did not match the expected -of json shape: ${result.error.message}`);
  }

  return result.data.results;
}
