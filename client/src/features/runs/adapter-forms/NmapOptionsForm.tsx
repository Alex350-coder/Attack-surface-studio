"use client";

import { z } from "zod";
import { TextField } from "@/components/ui/text-field";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

/** UX-only mirror of server/src/modules/adapters/nmap/nmap.adapter.ts's nmapOptionsSchema (FE-006). */
export const nmapOptionsSchema = z.object({
  ports: z
    .string()
    .regex(/^(\d{1,5})(-(\d{1,5}))?(,(\d{1,5})(-(\d{1,5}))?)*$/, "Invalid port range/list")
    .optional()
    .or(z.literal("")),
  scanType: z.enum(["connect", "syn"]),
  detectServices: z.boolean(),
  detectOs: z.boolean(),
});
export type NmapOptions = z.infer<typeof nmapOptionsSchema>;

export const nmapOptionsDefault: NmapOptions = {
  ports: "",
  scanType: "connect",
  detectServices: true,
  detectOs: false,
};

type Props = {
  value: NmapOptions;
  onChange: (value: NmapOptions) => void;
};

export function NmapOptionsForm({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <TextField
        id="nmap-ports"
        label="Ports (optional)"
        placeholder="e.g. 22,80,443 or 1-1024"
        value={value.ports ?? ""}
        onChange={(ports) => onChange({ ...value, ports })}
      />
      <Select
        id="nmap-scan-type"
        label="Scan type"
        value={value.scanType}
        onChange={(scanType) => onChange({ ...value, scanType: scanType as NmapOptions["scanType"] })}
        options={[
          { value: "connect", label: "TCP connect" },
          { value: "syn", label: "SYN (requires elevated privileges)" },
        ]}
      />
      <Checkbox
        id="nmap-detect-services"
        label="Detect service versions"
        checked={value.detectServices}
        onChange={(detectServices) => onChange({ ...value, detectServices })}
      />
      <Checkbox
        id="nmap-detect-os"
        label="Detect operating system"
        checked={value.detectOs}
        onChange={(detectOs) => onChange({ ...value, detectOs })}
      />
    </div>
  );
}
