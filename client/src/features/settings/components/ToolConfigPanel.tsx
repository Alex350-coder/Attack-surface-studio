"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useTools } from "@/features/runs/api/use-tools";
import { useDetectTool, useSetToolConfig, useToolConfig } from "../api/use-tool-config";

type Props = {
  projectId: string;
};

/** Per-tool detect button + execution-mode config, driven by the static `GET /tools` registry. */
export function ToolConfigPanel({ projectId }: Props) {
  const toolsQuery = useTools();

  if (toolsQuery.isLoading) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Loading tools…</p>;
  }
  if (toolsQuery.isError) {
    return <p role="alert" className="text-sm text-[var(--node-critical)]">Failed to load the tool registry.</p>;
  }

  const tools = toolsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Tools</h2>
      {tools.length === 0 ? (
        <p className="text-sm text-[var(--color-foreground-muted)]">No tools registered.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tools.map((tool) => (
            <ToolConfigRow key={tool.id} projectId={projectId} toolId={tool.id} displayName={tool.displayName} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ToolConfigRow({
  projectId,
  toolId,
  displayName,
}: {
  projectId: string;
  toolId: string;
  displayName: string;
}) {
  const configQuery = useToolConfig(projectId, toolId);
  const setConfig = useSetToolConfig(projectId, toolId);
  const detectTool = useDetectTool(projectId, toolId);
  // Local override once the user touches the select; until then, always reflect the saved
  // config. A plain `useState(configQuery.data?.executionMode ?? "local")` initializer would
  // only run once on mount and go stale once the query resolves after the first render,
  // silently reverting a saved "docker" config back to "local" on the next Save.
  const [modeOverride, setModeOverride] = useState<"local" | "docker" | null>(null);
  const mode = modeOverride ?? configQuery.data?.executionMode ?? "local";

  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{displayName}</span>
        {detectTool.data ? (
          <Badge tone={detectTool.data.available ? "success" : "danger"}>
            {detectTool.data.available ? `Available${detectTool.data.version ? ` (${detectTool.data.version})` : ""}` : "Unavailable"}
          </Badge>
        ) : null}
      </div>
      <div className="flex items-end gap-2">
        <Select
          id={`tool-${toolId}-mode`}
          label="Execution mode"
          value={mode}
          onChange={(value) => setModeOverride(value as "local" | "docker")}
          options={[
            { value: "local", label: "Local" },
            { value: "docker", label: "Docker" },
          ]}
        />
        <Button type="button" size="sm" variant="secondary" onClick={() => detectTool.mutate(mode)} disabled={detectTool.isPending}>
          {detectTool.isPending ? "Detecting…" : "Detect"}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => setConfig.mutate({ executionMode: mode, config: {} })}
          disabled={setConfig.isPending}
        >
          {setConfig.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {detectTool.isError ? (
        <p role="alert" className="text-xs text-[var(--node-critical)]">
          {detectTool.error.message}
        </p>
      ) : null}
      {setConfig.isError ? (
        <p role="alert" className="text-xs text-[var(--node-critical)]">
          {setConfig.error.message}
        </p>
      ) : null}
    </li>
  );
}
