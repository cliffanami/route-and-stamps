"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Tag } from "@/components/ui/Tag";
import type { PackingItem, PackingItemCheck } from "@/types/database.types";
import type { TripMember } from "@/lib/queries/use-trip-members";

interface PackingItemDetailDialogProps {
  item: PackingItem | null;
  checks: PackingItemCheck[];
  members: TripMember[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// The (i) button's destination — full item text (the grid truncates it),
// per-person completion status, and the edit/delete actions that used to
// live inline in the old list rows. Keeps PackingMatrix's rows compact
// without losing anything.
export function PackingItemDetailDialog({
  item,
  checks,
  members,
  onClose,
  onEdit,
  onDelete,
}: PackingItemDetailDialogProps) {
  return (
    <Dialog
      open={item !== null}
      onClose={onClose}
      title={item?.name ?? ""}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" variant="secondary" onClick={onDelete}>
            Delete
          </Button>
        </>
      }
    >
      {item && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {item.category && <Tag variant="neutral">{item.category}</Tag>}
            {item.is_document && <Tag variant="neutral">Document</Tag>}
            <Tag variant="neutral">
              {item.is_shared ? "Shared" : "Per person"}
            </Tag>
          </div>

          {item.due_date && (
            <p className="text-muted">
              Due{" "}
              {new Date(item.due_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}

          {item.is_shared ? (
            <p>{item.is_checked ? "Checked off." : "Not checked off yet."}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {members.map((member) => {
                const check = checks.find(
                  (c) => c.item_id === item.id && c.user_id === member.user_id,
                );
                return (
                  <p key={member.user_id}>
                    {member.displayName}:{" "}
                    {check
                      ? `checked ${new Date(check.checked_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : "not checked yet"}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
