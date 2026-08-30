"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { useAddOrAssignMember, useProjectMembers, type ProjectMember } from "../api/use-project-members";

type Props = {
  projectId: string;
};

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

/**
 * Lists project members and lets an owner/admin add a new member or re-assign an existing one's
 * role by email (the backend upserts by email, BE-010). There is no removal endpoint yet -- this
 * is a documented limitation (AMD-006), not an oversight.
 */
export function MembersPanel({ projectId }: Props) {
  const membersQuery = useProjectMembers(projectId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (membersQuery.isLoading) {
    return <p className="text-sm text-[var(--color-foreground-muted)]">Loading members…</p>;
  }
  if (membersQuery.isError) {
    return <p role="alert" className="text-sm text-[var(--node-critical)]">Failed to load members.</p>;
  }

  const members = membersQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Members</h2>
        <Button type="button" size="sm" onClick={() => setIsDialogOpen(true)}>
          Add or reassign member
        </Button>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-[var(--color-foreground-muted)]">No members yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </ul>
      )}
      {isDialogOpen ? <AddOrAssignMemberDialog projectId={projectId} onClose={() => setIsDialogOpen(false)} /> : null}
    </div>
  );
}

function MemberRow({ member }: { member: ProjectMember }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3">
      <span className="font-mono text-xs text-[var(--color-foreground-muted)]">{member.userId}</span>
      <Badge tone="neutral">{member.role}</Badge>
    </li>
  );
}

function AddOrAssignMemberDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const addOrAssignMember = useAddOrAssignMember(projectId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectMember["role"]>("member");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!email.trim()) {
      setValidationError("An email is required.");
      return;
    }
    setValidationError(null);
    addOrAssignMember.mutate({ email: email.trim(), role }, { onSuccess: onClose });
  }

  const errorMessage = validationError ?? (addOrAssignMember.isError ? addOrAssignMember.error.message : null);

  return (
    <Dialog title="Add or reassign member" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextField id="member-email" label="Email" value={email} onChange={setEmail} />
        <Select
          id="member-role"
          label="Role"
          value={role}
          onChange={(value) => setRole(value as ProjectMember["role"])}
          options={ROLE_OPTIONS}
        />
        {errorMessage ? (
          <p role="alert" className="text-sm text-[var(--node-critical)]">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={addOrAssignMember.isPending}>
            {addOrAssignMember.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
