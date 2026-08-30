"use client";

import Link from "next/link";
import { useProjects } from "../api/use-projects";

type Props = {
  activeProjectId: string | null;
};

/** Hover-revealed project menu in the workspace top nav. Links to /app/projects/[id] (FE-012's consumer route). */
export function ProjectSwitcher({ activeProjectId }: Props) {
  const { data: projects } = useProjects();
  const activeProject = projects?.find((project) => project.id === activeProjectId);

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex h-8 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm text-[var(--color-foreground-muted)] transition-colors hover:text-[var(--color-foreground)]"
      >
        {activeProject?.name ?? "Select a project"}
      </button>
      {projects && projects.length > 0 ? (
        <div className="invisible absolute left-0 top-full z-10 mt-2 w-56 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/app/projects/${project.id}`}
              className="block rounded-[calc(var(--radius-md)-0.25rem)] px-3 py-2 text-sm text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
            >
              {project.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
