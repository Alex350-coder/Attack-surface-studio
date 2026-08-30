"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { MembersPanel } from "./MembersPanel";
import { ScopeEditor } from "./ScopeEditor";
import { ToolConfigPanel } from "./ToolConfigPanel";

type Props = {
  projectId: string;
};

const SECTIONS = ["scope", "members", "tools"] as const;
type Section = (typeof SECTIONS)[number];

export function SettingsPage({ projectId }: Props) {
  const [section, setSection] = useState<Section>("scope");

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Tabs value={section} onChange={(value) => setSection(value as Section)}>
        <Tabs.List>
          <Tabs.Trigger value="scope">Scope</Tabs.Trigger>
          <Tabs.Trigger value="members">Members</Tabs.Trigger>
          <Tabs.Trigger value="tools">Tools</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Panel value="scope">
          <ScopeEditor projectId={projectId} />
        </Tabs.Panel>
        <Tabs.Panel value="members">
          <MembersPanel projectId={projectId} />
        </Tabs.Panel>
        <Tabs.Panel value="tools">
          <ToolConfigPanel projectId={projectId} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
