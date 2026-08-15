"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useUploadPlacePhoto } from "@/lib/queries/use-places";
import { validatePhotoFile } from "@/lib/validation/place-media.schema";

interface PhotoUploadProps {
  tripId: string;
  placeId: string;
}

// Online-only for M2 — routing this through the offline write queue
// (ARCHITECTURE.md §3 lib/offline/) is ROADMAP.md M6's job, not this one's.
export function PhotoUpload({ tripId, placeId }: PhotoUploadProps) {
  const uploadPhoto = useUploadPlacePhoto(tripId);
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    try {
      await uploadPhoto.mutateAsync({ placeId, file });
      showToast("Photo saved");
    } catch {
      setError("Couldn't upload that photo — try again.");
    }
  }

  return (
    <div className="field">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        disabled={uploadPhoto.isPending}
      >
        {uploadPhoto.isPending ? "Uploading…" : "Add a photo"}
      </Button>
      {error && <p className="text-muted">{error}</p>}
    </div>
  );
}
