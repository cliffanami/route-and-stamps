import type { MealTag } from "@/types/database.types";

const OPTIONS: { value: MealTag; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
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

// Reuses Broadsheet's .seg/.seg-opt segmented-control styling (CONVENTIONS.md
// §5b, same pattern as VoteScale/tip-format/packing-scope) but with
// checkboxes instead of radios — meal tags aren't mutually exclusive, a
// place can be marked for more than one meal at once.
export function MealTagPicker({ value, onChange }: MealTagPickerProps) {
  function toggle(tag: MealTag) {
    onChange(
      value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag],
    );
  }

  return (
    <div className="field">
      <label id="meal-tags-label">Meals (optional)</label>
      <div className="seg" role="group" aria-labelledby="meal-tags-label">
        {OPTIONS.map((option) => (
          <label key={option.value} className="seg-opt">
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}
