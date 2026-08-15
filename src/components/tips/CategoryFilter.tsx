"use client";

interface CategoryFilterProps {
  categories: string[];
  selected: string | null;
  onChange: (category: string | null) => void;
}

// Clickable .tag chips — Broadsheet's existing status-tag pattern
// (CONVENTIONS.md §5b), not a separate filter-chip style.
export function CategoryFilter({
  categories,
  selected,
  onChange,
}: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`tag ${selected === null ? "tag-accent" : "tag-neutral"}`}
        onClick={() => onChange(null)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          className={`tag ${selected === category ? "tag-accent" : "tag-neutral"}`}
          onClick={() => onChange(selected === category ? null : category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
