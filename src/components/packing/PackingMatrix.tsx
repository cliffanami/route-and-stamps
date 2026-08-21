import { Fragment } from "react";
import { Info } from "@phosphor-icons/react";
import type { PackingItem, PackingItemCheck } from "@/types/database.types";
import type { TripMember } from "@/lib/queries/use-trip-members";

interface PackingMatrixProps {
  items: PackingItem[];
  checks: PackingItemCheck[];
  members: TripMember[];
  currentUserId: string | null;
  onToggleShared: (item: PackingItem, checked: boolean) => void;
  // Always applies to the signed-in user's own row — there's no "check
  // this on someone else's behalf" (ROADMAP.md's packing brainstorm: the
  // point of per-person tracking is being accountable to each other, which
  // a proxy-checkable box would undermine). Other members' cells render
  // read-only.
  onToggleCheck: (item: PackingItem, checked: boolean) => void;
  onShowDetail: (item: PackingItem) => void;
}

function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null;
  return new Date(dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Frozen first column + horizontal scroll for the rest, per explicit
// design direction — item name truncates with an ellipsis rather than
// trying to auto-summarize into "a word" (name lengths vary too much for
// that to be reliable); the (i) button is the escape hatch to the full
// text and details. One accent color only (Broadsheet §5b) — checkboxes
// use the browser/`.input`-family default styling already established
// elsewhere, not a second accent for "checked".
export function PackingMatrix({
  items,
  checks,
  members,
  currentUserId,
  onToggleShared,
  onToggleCheck,
  onShowDetail,
}: PackingMatrixProps) {
  if (items.length === 0) return null;

  // Group by category, preserving first-seen order — matches how the rest
  // of the app treats free-text categories (no fixed/alphabetical sort).
  const categoryOrder: string[] = [];
  const byCategory = new Map<string, PackingItem[]>();
  for (const item of items) {
    const key = item.category ?? "General";
    if (!byCategory.has(key)) {
      byCategory.set(key, []);
      categoryOrder.push(key);
    }
    byCategory.get(key)!.push(item);
  }

  function isChecked(item: PackingItem, userId: string): boolean {
    return checks.some((c) => c.item_id === item.id && c.user_id === userId);
  }

  const stickyColStyle = {
    position: "sticky" as const,
    left: 0,
    background: "var(--color-bg)",
    boxShadow: "1px 0 0 var(--color-divider)",
  };

  return (
    <div className="overflow-x-auto">
      <table className="table" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={{ ...stickyColStyle, minWidth: 190 }}>Item</th>
            {members.map((member) => (
              <th
                key={member.user_id}
                style={{ minWidth: 88, textAlign: "center" }}
              >
                {member.displayName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categoryOrder.map((category) => (
            <Fragment key={category}>
              <tr>
                <td
                  colSpan={1 + members.length}
                  style={{
                    ...stickyColStyle,
                    background: "var(--color-surface)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "color-mix(in srgb, var(--color-text) 60%, transparent)",
                    position: "static",
                  }}
                >
                  {category}
                </td>
              </tr>
              {byCategory.get(category)!.map((item) => {
                const due = formatDueDate(item.due_date);
                return (
                  <tr key={item.id}>
                    <td style={stickyColStyle}>
                      <div className="flex items-center gap-1">
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 150,
                            display: "inline-block",
                          }}
                        >
                          {item.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => onShowDetail(item)}
                          aria-label={`Details for ${item.name}`}
                          className="inline-flex items-center justify-center"
                        >
                          <Info weight="duotone" size={14} />
                        </button>
                      </div>
                      {due && (
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          Due {due}
                        </div>
                      )}
                    </td>
                    {item.is_shared ? (
                      <td colSpan={members.length} style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={item.is_checked}
                          disabled={!currentUserId}
                          onChange={(event) =>
                            onToggleShared(item, event.target.checked)
                          }
                          aria-label={`${item.name} (shared)`}
                        />
                      </td>
                    ) : (
                      members.map((member) => (
                        <td key={member.user_id} style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isChecked(item, member.user_id)}
                            disabled={member.user_id !== currentUserId}
                            onChange={(event) =>
                              onToggleCheck(item, event.target.checked)
                            }
                            aria-label={`${item.name} — ${member.displayName}`}
                          />
                        </td>
                      ))
                    )}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
