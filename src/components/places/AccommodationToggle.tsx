interface AccommodationToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// Plain checkbox, same markup as PackingForm's isDocument toggle — a single
// boolean doesn't need MealTagPicker's .seg multi-select treatment.
export function AccommodationToggle({
  checked,
  onChange,
}: AccommodationToggleProps) {
  return (
    <label className="field flex flex-row items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      Where we&apos;re staying
    </label>
  );
}
