"use client";

import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";

/** UX-only mirror of server/src/modules/adapters/nuclei/nuclei.adapter.ts's nucleiOptionsSchema (FE-006). */
const TEMPLATE_TAGS = ["cve", "exposure", "misconfig", "default-login", "tech"] as const;

export const nucleiOptionsSchema = z.object({
  tags: z.array(z.enum(TEMPLATE_TAGS)).min(1, "Select at least one tag"),
  severityFilter: z.enum(["info", "low", "medium", "high", "critical"]).optional().or(z.literal("")),
});
export type NucleiOptions = z.infer<typeof nucleiOptionsSchema>;

export const nucleiOptionsDefault: NucleiOptions = {
  tags: ["exposure", "misconfig"],
  severityFilter: "",
};

type Props = {
  value: NucleiOptions;
  onChange: (value: NucleiOptions) => void;
};

export function NucleiOptionsForm({ value, onChange }: Props) {
  function toggleTag(tag: (typeof TEMPLATE_TAGS)[number], checked: boolean): void {
    const tags = checked ? [...value.tags, tag] : value.tags.filter((existing) => existing !== tag);
    onChange({ ...value, tags });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--color-foreground-muted)]">Template tags</span>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {TEMPLATE_TAGS.map((tag) => (
            <Checkbox
              key={tag}
              id={`nuclei-tag-${tag}`}
              label={tag}
              checked={value.tags.includes(tag)}
              onChange={(checked) => toggleTag(tag, checked)}
            />
          ))}
        </div>
      </div>
      <Select
        id="nuclei-severity-filter"
        label="Minimum severity (optional)"
        value={value.severityFilter ?? ""}
        onChange={(severityFilter) => onChange({ ...value, severityFilter: severityFilter as NucleiOptions["severityFilter"] })}
        options={[
          { value: "", label: "Any" },
          { value: "info", label: "Info" },
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
          { value: "critical", label: "Critical" },
        ]}
      />
    </div>
  );
}
