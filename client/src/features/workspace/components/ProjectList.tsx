"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjects } from "../api/use-projects";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { Button } from "@/components/ui/button";

/** All four async states per surface (FE-017): loading, error, empty, success. */
export function ProjectList() {
  const { data: projects, isLoading, isError, error } = useProjects();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-foreground-muted)]">Loading projects…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p role="alert" className="text-sm text-[var(--node-critical)]">
          {error.message}
        </p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h2 className="text-xl font-semibold text-[var(--color-foreground)]">No projects yet</h2>
        <p className="max-w-sm text-sm text-[var(--color-foreground-muted)]">
          Create your first project to start mapping an engagement&apos;s attack surface.
        </p>
        <Button onClick={() => setIsDialogOpen(true)}>Create your first project</Button>
        {isDialogOpen ? <CreateProjectDialog onClose={() => setIsDialogOpen(false)} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">Projects</h1>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          New project
        </Button>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/app/projects/${project.id}`}
              className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]"
            >
              <h2 className="text-base font-medium text-[var(--color-foreground)]">{project.name}</h2>
              <p className="mt-1 text-sm text-[var(--color-foreground-subtle)]">{project.slug}</p>
            </Link>
          </li>
        ))}
      </ul>
      {isDialogOpen ? <CreateProjectDialog onClose={() => setIsDialogOpen(false)} /> : null}
    </div>
  );
}
