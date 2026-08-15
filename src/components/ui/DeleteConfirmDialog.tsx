"use client";

import { Button } from "./Button";
import { Dialog } from "./Dialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  pending?: boolean;
  error?: string | null;
}

// Shared by every "delete this X" confirmation (places, tips, budget
// lines, packing items) — the confirm button is the one deliberate,
// isolated use of the magenta second accent (CONVENTIONS.md §5b: rare,
// never alongside cyan in the same small component), signaling
// destructive intent without relying on color alone — the copy itself
// says "This can't be undone."
export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  pending,
  error,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={pending}
            style={{ background: "var(--color-accent-2)" }}
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </>
      }
    >
      <p>{description}</p>
      {error && <p className="text-muted">{error}</p>}
    </Dialog>
  );
}
