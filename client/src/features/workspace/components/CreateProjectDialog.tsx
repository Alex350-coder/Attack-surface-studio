"use client";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useCreateProject } from "../api/use-projects";

type Props = {
  onClose: () => void;
};

// UX-only mirror of the backend's create-project validation -- server remains authoritative (FE-006).
const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug is required.")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens."),
});

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Portal-rendered so the dialog escapes any clipping/stacking-context ancestors in the workspace
 * shell (react/patterns.md Portals guidance).
 */
export function CreateProjectDialog({ onClose }: Props) {
  const router = useRouter();
  const createProject = useCreateProject();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleNameChange(value: string): void {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = createProjectSchema.safeParse({ name, slug });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }
    setValidationError(null);
    createProject.mutate(parsed.data, {
      onSuccess: (project) => {
        onClose();
        router.push(`/app/projects/${project.id}`);
      },
    });
  }

  const errorMessage = validationError ?? (createProject.isError ? createProject.error.message : null);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create project"
        className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl"
      >
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">New project</h2>
        <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
          Projects group everything discovered about a target engagement.
        </p>
        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-name" className="text-sm font-medium text-[var(--color-foreground)]">
              Name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3.5 text-sm text-[var(--color-foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-slug" className="text-sm font-medium text-[var(--color-foreground)]">
              Slug
            </label>
            <input
              id="project-slug"
              type="text"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3.5 text-sm text-[var(--color-foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            />
          </div>
          {errorMessage ? (
            <p role="alert" className="text-sm text-[var(--node-critical)]">
              {errorMessage}
            </p>
          ) : null}
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={createProject.isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={createProject.isPending}>
              {createProject.isPending ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
