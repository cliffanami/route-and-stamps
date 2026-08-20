"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";

interface TagListEditorProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  // Applied before dedup/add — e.g. currency codes uppercase themselves so
  // "jpy" and "JPY" aren't treated as different entries.
  normalize?: (value: string) => string;
  // Runs against the normalized value; a returned message blocks the add
  // and is shown inline instead.
  validate?: (value: string) => string | null;
}

// Backs the strict dropdowns elsewhere in the app (currency, tip/budget
// category) — auto-saves on every add/remove via onChange rather than a
// separate Save button, since each change is a small, atomic edit
// (ROADMAP.md Milestone A follow-up).
export function TagListEditor({
  label,
  values,
  onChange,
  placeholder,
  normalize,
  validate,
}: TagListEditorProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const clean = normalize ? normalize(draft) : draft.trim();
    if (!clean) return;

    const message = validate?.(clean) ?? null;
    if (message) {
      setError(message);
      return;
    }

    setError(null);
    if (!values.includes(clean)) onChange([...values, clean]);
    setDraft("");
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="flex flex-wrap gap-2">
        {values.length === 0 && <p className="text-muted">None yet.</p>}
        {values.map((value) => (
          <Tag key={value} variant="neutral">
            <span className="flex items-center gap-1">
              {value}
              <button
                type="button"
                onClick={() => remove(value)}
                aria-label={`Remove ${value}`}
              >
                <X weight="bold" size={12} />
              </button>
            </span>
          </Tag>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
      {error && <p className="text-muted">{error}</p>}
    </div>
  );
}
