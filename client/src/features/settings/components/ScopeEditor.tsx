"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useProject } from "@/features/workspace/api/use-project";
import { useUpdateProject } from "../api/use-update-project";

type Props = {
  projectId: string;
};

// UX-only mirror of server/src/modules/projects/repositories/project-scope.schema.ts's
// scopeEntrySchema -- the server independently re-validates every entry (FE-006).
const scopeEntrySchema = z.string().trim().min(1, "Enter a hostname, wildcard domain, IP, or CIDR range.");

// `Project.scope` is typed `z.unknown()` (use-projects.ts) because the client never trusts a
// stored value's shape sight-unseen -- parse it defensively here instead of casting, since a
// malformed/older/future scope shape must not crash this panel (no `as` cast, per the project's
// "no unsafe casts" standard).
const scopeShapeSchema = z
  .object({
    includes: z.array(z.string()).default([]),
    excludes: z.array(z.string()).default([]),
  })
  .catch({ includes: [], excludes: [] });

type ScopeList = "includes" | "excludes";

/**
 * Tag-list add/remove UI over the project's `scope.includes`/`scope.excludes` -- the same
 * allow/deny list the Orchestrator enforces before any tool run (SECURITY_MODEL.md). Editing
 * scope here only changes what the server will accept; it never bypasses server-side enforcement.
 */
export function ScopeEditor({ projectId }: Props) {
  const projectQuery = useProject(projectId);
  const updateProject = useUpdateProject(projectId);

  // `includes`/`excludes` are locally editable copies of the server scope (add/remove entries
  // mutate them optimistically before saving), so they can't be derived with useMemo. Seed them
  // from whatever scope is already available at mount, then re-seed whenever a *new* server
  // payload arrives by adjusting state directly during render (the React-recommended alternative
  // to a useEffect+setState sync, see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes),
  // which avoids the extra render pass an effect-based sync would trigger.
  const [includes, setIncludes] = useState<string[]>(
    () => scopeShapeSchema.parse(projectQuery.data?.scope).includes,
  );
  const [excludes, setExcludes] = useState<string[]>(
    () => scopeShapeSchema.parse(projectQuery.data?.scope).excludes,
  );
  const [loadedScope, setLoadedScope] = useState(projectQuery.data?.scope);
  if (projectQuery.data && projectQuery.data.scope !== loadedScope) {
    const scope = scopeShapeSchema.parse(projectQuery.data.scope);
    setLoadedScope(projectQuery.data.scope);
    setIncludes(scope.includes);
    setExcludes(scope.excludes);
  }

  if (projectQuery.isLoading) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Loading scope…</p>;
  }
  if (projectQuery.isError) {
    return <p role="alert" className="text-sm text-[var(--node-critical)]">Failed to load the project scope.</p>;
  }

  // On rejection (e.g. the server's stricter hostname/CIDR format check -- see the
  // scopeEntrySchema comment above), roll the optimistic edit back to the pre-edit lists.
  // Without this, a rejected entry stayed visible as if it were in effect (BUG #8): misleading
  // for a value that gates what the Orchestrator will let a tool run touch.
  function save(nextIncludes: string[], nextExcludes: string[], rollback: { includes: string[]; excludes: string[] }): void {
    updateProject.mutate(
      { scope: { includes: nextIncludes, excludes: nextExcludes } },
      {
        onError: () => {
          setIncludes(rollback.includes);
          setExcludes(rollback.excludes);
        },
      },
    );
  }

  function addEntry(list: ScopeList, value: string): { ok: boolean; error?: string } {
    const parsed = scopeEntrySchema.safeParse(value);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message };
    }
    const rollback = { includes, excludes };
    if (list === "includes") {
      const next = [...includes, parsed.data];
      setIncludes(next);
      save(next, excludes, rollback);
    } else {
      const next = [...excludes, parsed.data];
      setExcludes(next);
      save(includes, next, rollback);
    }
    return { ok: true };
  }

  function removeEntry(list: ScopeList, entry: string): void {
    const rollback = { includes, excludes };
    if (list === "includes") {
      const next = includes.filter((item) => item !== entry);
      setIncludes(next);
      save(next, excludes, rollback);
    } else {
      const next = excludes.filter((item) => item !== entry);
      setExcludes(next);
      save(includes, next, rollback);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Scope</h2>
      <ScopeList title="In scope" list="includes" entries={includes} onAdd={addEntry} onRemove={removeEntry} />
      <ScopeList title="Excluded" list="excludes" entries={excludes} onAdd={addEntry} onRemove={removeEntry} />
      {updateProject.isError ? (
        <p role="alert" className="text-sm text-[var(--node-critical)]">
          {updateProject.error.message}
        </p>
      ) : null}
    </div>
  );
}

function ScopeList({
  title,
  list,
  entries,
  onAdd,
  onRemove,
}: {
  title: string;
  list: ScopeList;
  entries: string[];
  onAdd: (list: ScopeList, value: string) => { ok: boolean; error?: string };
  onRemove: (list: ScopeList, entry: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const result = onAdd(list, draft);
    if (!result.ok) {
      setError(result.error ?? "Invalid entry.");
      return;
    }
    setError(null);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-[var(--color-foreground-muted)]">{title}</h3>
      {entries.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {entries.map((entry) => (
            <li
              key={entry}
              className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface-hover)] px-3 py-1 text-xs text-[var(--color-foreground)]"
            >
              {entry}
              <button type="button" onClick={() => onRemove(list, entry)} aria-label={`Remove ${entry}`}>
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--color-foreground-muted)]">None.</p>
      )}
      <form onSubmit={handleSubmit} noValidate className="flex items-end gap-2">
        <TextField id={`scope-${list}-entry`} label="Add entry" value={draft} onChange={setDraft} />
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-xs text-[var(--node-critical)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
