/**
 * Wraps `file-type`'s magic-byte content sniffing (SEC-051/OWA-024: never trust a client-supplied
 * Content-Type or filename extension). Isolated in its own module because `file-type` v17+ is
 * ESM-only while this project compiles to CommonJS (`tsconfig.json`'s `"module": "commonjs"`) --
 * a static `import` would fail to `require()` at runtime, so it's loaded via a dynamic `import()`,
 * which Node's CJS runtime can resolve to an ESM module. Any parse failure (including the kind of
 * malformed-input hang/crash `file-type`'s advisories describe) is treated as "type not detected"
 * rather than allowed to propagate, since detection failure must fail closed for an upload check.
 */
export async function sniffMimeType(buffer: Buffer): Promise<string | undefined> {
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(buffer).catch(() => undefined);
  return detected?.mime;
}
