"use client";

import { z } from "zod";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";

/** UX-only mirror of server/src/modules/adapters/ffuf/ffuf.adapter.ts's ffufOptionsSchema (FE-006). */
export const ffufOptionsSchema = z.object({
  wordlist: z.enum(["common-small", "common-medium"]),
  matchStatusCodes: z.string().regex(/^\d{3}(,\d{3})*$/, "Invalid status code list"),
});
export type FfufOptions = z.infer<typeof ffufOptionsSchema>;

export const ffufOptionsDefault: FfufOptions = {
  wordlist: "common-small",
  matchStatusCodes: "200,204,301,302,307,401,403",
};

type Props = {
  value: FfufOptions;
  onChange: (value: FfufOptions) => void;
};

export function FfufOptionsForm({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Select
        id="ffuf-wordlist"
        label="Wordlist"
        value={value.wordlist}
        onChange={(wordlist) => onChange({ ...value, wordlist: wordlist as FfufOptions["wordlist"] })}
        options={[
          { value: "common-small", label: "Common (small)" },
          { value: "common-medium", label: "Common (medium)" },
        ]}
      />
      <TextField
        id="ffuf-match-status-codes"
        label="Match status codes"
        value={value.matchStatusCodes}
        onChange={(matchStatusCodes) => onChange({ ...value, matchStatusCodes })}
      />
    </div>
  );
}
