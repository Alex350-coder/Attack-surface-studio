"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { useTools } from "../api/use-tools";
import { useEnqueueRun } from "../api/use-runs";
import { NmapOptionsForm, nmapOptionsDefault, nmapOptionsSchema } from "../adapter-forms/NmapOptionsForm";
import { FfufOptionsForm, ffufOptionsDefault, ffufOptionsSchema } from "../adapter-forms/FfufOptionsForm";
import { NucleiOptionsForm, nucleiOptionsDefault, nucleiOptionsSchema } from "../adapter-forms/NucleiOptionsForm";

type Props = {
  projectId: string;
};

/**
 * Tool + mode + target + a dynamic per-adapter options form. Each adapter's options schema is a
 * hand-written frontend Zod mirror (FE-006, same precedent as use-projects.ts) -- the server
 * remains authoritative and independently re-validates via its own `*OptionsSchema`.
 */
export function RunLauncher({ projectId }: Props) {
  const toolsQuery = useTools();
  const enqueueRun = useEnqueueRun(projectId);

  const [adapterId, setAdapterId] = useState("");
  const [executionMode, setExecutionMode] = useState<"local" | "docker">("local");
  const [target, setTarget] = useState("");
  const [nmapOptions, setNmapOptions] = useState(nmapOptionsDefault);
  const [ffufOptions, setFfufOptions] = useState(ffufOptionsDefault);
  const [nucleiOptions, setNucleiOptions] = useState(nucleiOptionsDefault);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedTool = useMemo(
    () => toolsQuery.data?.find((tool) => tool.id === adapterId) ?? toolsQuery.data?.[0],
    [toolsQuery.data, adapterId],
  );
  const effectiveAdapterId = adapterId || selectedTool?.id || "";

  function buildOptions(): { options: unknown; error: string | null } {
    if (effectiveAdapterId === "nmap") {
      const parsed = nmapOptionsSchema.safeParse(nmapOptions);
      return parsed.success
        ? { options: parsed.data, error: null }
        : { options: null, error: parsed.error.issues[0]?.message ?? "Invalid nmap options" };
    }
    if (effectiveAdapterId === "ffuf") {
      const parsed = ffufOptionsSchema.safeParse(ffufOptions);
      return parsed.success
        ? { options: parsed.data, error: null }
        : { options: null, error: parsed.error.issues[0]?.message ?? "Invalid ffuf options" };
    }
    if (effectiveAdapterId === "nuclei") {
      const parsed = nucleiOptionsSchema.safeParse(nucleiOptions);
      return parsed.success
        ? { options: parsed.data, error: null }
        : { options: null, error: parsed.error.issues[0]?.message ?? "Invalid nuclei options" };
    }
    return { options: {}, error: null };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!effectiveAdapterId) {
      setValidationError("Select a tool to run.");
      return;
    }
    if (!target.trim()) {
      setValidationError("A target is required.");
      return;
    }
    const { options, error } = buildOptions();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    enqueueRun.mutate({ adapterId: effectiveAdapterId, executionMode, target: target.trim(), options });
  }

  if (toolsQuery.isLoading) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Loading available tools…</p>;
  }
  if (toolsQuery.isError) {
    return <p role="alert" className="text-sm text-[var(--node-critical)]">Failed to load the tool registry.</p>;
  }
  if (!toolsQuery.data || toolsQuery.data.length === 0) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">No tools are registered.</p>;
  }

  const errorMessage = validationError ?? (enqueueRun.isError ? enqueueRun.error.message : null);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-lg flex-col gap-4">
      <Select
        id="run-adapter"
        label="Tool"
        value={effectiveAdapterId}
        onChange={setAdapterId}
        options={toolsQuery.data.map((tool) => ({ value: tool.id, label: tool.displayName }))}
      />
      <Select
        id="run-execution-mode"
        label="Execution mode"
        value={executionMode}
        onChange={(mode) => setExecutionMode(mode as "local" | "docker")}
        options={(selectedTool?.supportedModes ?? ["local"]).map((mode) => ({ value: mode, label: mode }))}
      />
      <TextField
        id="run-target"
        label="Target"
        placeholder="example.com, 10.0.0.0/24, https://example.com"
        value={target}
        onChange={setTarget}
      />

      {effectiveAdapterId === "nmap" ? <NmapOptionsForm value={nmapOptions} onChange={setNmapOptions} /> : null}
      {effectiveAdapterId === "ffuf" ? <FfufOptionsForm value={ffufOptions} onChange={setFfufOptions} /> : null}
      {effectiveAdapterId === "nuclei" ? <NucleiOptionsForm value={nucleiOptions} onChange={setNucleiOptions} /> : null}

      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--node-critical)]">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={enqueueRun.isPending} className="self-start">
        {enqueueRun.isPending ? "Starting…" : "Start run"}
      </Button>
    </form>
  );
}
