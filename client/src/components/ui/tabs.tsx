"use client";

import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  onChange: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`<Tabs.${componentName}> must be rendered inside <Tabs>`);
  }
  return context;
}

type TabsProps = {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
};

/**
 * Compound-component Tabs sharing state via context (react/patterns.md's Tabs example), used by
 * the project sub-navigation and Settings' sections. Controlled (`value`/`onChange`) so callers
 * can sync it with the route or leave it as local UI state.
 */
function TabsRoot({ value, onChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="tablist" className={cn("flex gap-1 border-b border-[var(--color-border)]", className)}>
      {children}
    </div>
  );
}

function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const { value: activeValue, onChange } = useTabsContext("Trigger");
  const isActive = activeValue === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onChange(value)}
      className={cn(
        "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
          : "border-transparent text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]",
      )}
    >
      {children}
    </button>
  );
}

function TabsPanel({ value, children }: { value: string; children: ReactNode }) {
  const { value: activeValue } = useTabsContext("Panel");
  if (activeValue !== value) return null;
  return (
    <div role="tabpanel" className="pt-6">
      {children}
    </div>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Panel: TabsPanel,
});
