"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./Button";

export interface DetailTab {
  key: string;
  label: string;
  content: ReactNode;
  // Omit entirely for a tab that has no "add" action (e.g. Overview, which
  // uses the page's own pencil-edit affordance instead — "add" doesn't
  // mean anything for editing existing fields).
  onAdd?: () => void;
  addLabel?: string;
}

interface DetailTabsProps {
  tabs: DetailTab[];
  defaultTab?: string;
}

// Shared by PlaceDetail and StopDetail (Overview/Tips/Costs) — built once,
// not twice. Reuses Broadsheet's existing .seg segmented control (same
// pattern as budget mode, tip format, packing scope) rather than a new
// tab-bar component. The active tab's own onAdd decides whether an "add"
// button shows at all, and what it does — not a hardcoded action here.
export function DetailTabs({ tabs, defaultTab }: DetailTabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];

  if (!activeTab) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="seg" role="radiogroup" aria-label="Section">
          {tabs.map((tab) => (
            <label key={tab.key} className="seg-opt">
              <input
                type="radio"
                name="detail-tab"
                value={tab.key}
                checked={active === tab.key}
                onChange={() => setActive(tab.key)}
              />
              {tab.label}
            </label>
          ))}
        </div>
        {activeTab.onAdd && (
          <Button type="button" variant="secondary" onClick={activeTab.onAdd}>
            {activeTab.addLabel ?? "Add"}
          </Button>
        )}
      </div>
      {activeTab.content}
    </div>
  );
}
