import { Coffee, ForkKnife, MoonStars } from "@phosphor-icons/react";
import type { MealTag } from "@/types/database.types";
import type { Icon } from "@phosphor-icons/react";

const OPTIONS: { value: MealTag; label: string; icon: Icon }[] = [
  { value: "breakfast", label: "Breakfast", icon: Coffee },
  { value: "lunch", label: "Lunch", icon: ForkKnife },
  { value: "dinner", label: "Dinner", icon: MoonStars },
];

// Shared with PlaceRow/PlaceDetail, which display whichever tags are set —
// one source of truth for the label text, same pattern as VOTE_LEVEL_LABEL.
export const MEAL_TAG_LABEL: Record<MealTag, string> = Object.fromEntries(
  OPTIONS.map((option) => [option.value, option.label]),
) as Record<MealTag, string>;

interface MealTagPickerProps {
  value: MealTag[];
  onChange: (value: MealTag[]) => void;
}

// A visible checkbox per option, not Broadsheet's .seg/.seg-opt hidden-input
// pattern — .seg reads as single-select by convention (vote scale, tip
// format), and meal tags aren't mutually exclusive, so an explicit checkbox
// plus an icon per meal makes both "which meals" and "more than one is
// fine" legible at a glance rather than relying on background-color alone.
// Same selected-state color treatment VoteScale already established
// (cyan-200 background, inline style, not a new token).
export function MealTagPicker({ value, onChange }: MealTagPickerProps) {
  function toggle(tag: MealTag) {
    onChange(
      value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag],
    );
  }

  return (
    <div className="field">
      <label id="meal-tags-label">Meals (optional)</label>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-labelledby="meal-tags-label"
      >
        {OPTIONS.map((option) => {
          const checked = value.includes(option.value);
          const IconComponent = option.icon;
          return (
            <label
              key={option.value}
              className="flex items-center gap-2"
              style={{
                border: "1px solid var(--color-divider)",
                borderRadius: "var(--radius-md)",
                padding: "6px 12px",
                background: checked ? "var(--color-accent-200)" : undefined,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option.value)}
              />
              <IconComponent weight="duotone" size={20} />
              {option.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
