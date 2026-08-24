"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { Tag } from "@/components/ui/Tag";
import { Card, CardTitle, CardMeta } from "@/components/ui/Card";
import { DetailTabs } from "@/components/ui/DetailTabs";
import { MEAL_TAG_LABEL } from "@/components/places/MealTagPicker";
import { TransportModeIcon } from "./transport-mode-icon";
import { TipCard } from "@/components/tips/TipCard";
import { TipForm } from "@/components/tips/TipForm";
import { CostLineRow } from "@/components/budget/CostLineRow";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { StopLogisticsForm } from "./StopLogisticsForm";
import { CheckInControl } from "./CheckInControl";
import { LocationMapLoader } from "@/components/map/LocationMapLoader";
import { OpenInGoogleMapsLink } from "@/components/map/OpenInGoogleMapsLink";
import { useStop, useDeleteStop } from "@/lib/queries/use-stops";
import { usePlaces } from "@/lib/queries/use-places";
import { useTips, useDeleteTip } from "@/lib/queries/use-tips";
import { useBudgetLines, useDeleteBudgetLine } from "@/lib/queries/use-budget-lines";
import { useStopCheckins } from "@/lib/queries/use-stop-checkins";
import { useTrip } from "@/lib/queries/use-trip";
import { splitDayNarrative } from "@/lib/text/split-day-narrative";
import type { Tip, BudgetLine } from "@/types/database.types";

interface StopDetailProps {
  tripId: string;
  stopId: string;
}

const COST_STATUS_LABEL: Record<string, string> = {
  included: "Included",
  own_account: "Own account",
  check: "Check",
};

// Route page's accordion becomes a shortcut into this — same relationship
// PlaceRow has to PlaceDetail. Overview/Tips/Costs via the shared
// DetailTabs, retrofit-matching PlaceDetail below.
export function StopDetail({ tripId, stopId }: StopDetailProps) {
  const { data: stop, isLoading } = useStop(tripId, stopId);
  const { data: trip } = useTrip(tripId);
  const { data: places = [] } = usePlaces(tripId);
  const { data: tips = [] } = useTips(tripId);
  const { data: budgetLines = [] } = useBudgetLines(tripId);
  const { data: checkins = [] } = useStopCheckins(tripId);
  const deleteStop = useDeleteStop(tripId);
  const deleteTip = useDeleteTip(tripId);
  const deleteCost = useDeleteBudgetLine(tripId);
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  // Only read at DetailTabs' own mount (key change forces a remount) —
  // checking in jumps straight to "what's planned here" once, but doesn't
  // fight the user if they navigate elsewhere afterward.
  const [defaultDetailTab, setDefaultDetailTab] = useState<"overview" | "places">("overview");
  const [confirmingDeleteStop, setConfirmingDeleteStop] = useState(false);
  const [deleteStopError, setDeleteStopError] = useState<string | null>(null);
  const [addingTip, setAddingTip] = useState(false);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [confirmingDeleteTip, setConfirmingDeleteTip] = useState(false);
  const [deleteTipError, setDeleteTipError] = useState<string | null>(null);
  const [addingCost, setAddingCost] = useState(false);
  const [transportCostDefaults, setTransportCostDefaults] = useState(false);
  const [editingCost, setEditingCost] = useState<BudgetLine | null>(null);
  const [confirmingDeleteCost, setConfirmingDeleteCost] = useState(false);
  const [deleteCostError, setDeleteCostError] = useState<string | null>(null);

  if (isLoading) return <p className="px-6 py-4 text-muted">Loading…</p>;
  if (!stop) return <p className="px-6 py-4 text-muted">Stop not found.</p>;

  const stopPlaces = places.filter((p) => p.nearest_stop_id === stopId);
  const accommodationPlaces = stopPlaces.filter((p) => p.is_accommodation);
  const stopTips = tips.filter((t) => t.related_stop_id === stopId);
  const stopCosts = budgetLines.filter((b) => b.stop_id === stopId);
  const placeNameById = new Map(places.map((p) => [p.id, p.name]));

  const tipDialogOpen = addingTip || editingTip !== null;
  function closeTipDialog() {
    setAddingTip(false);
    setEditingTip(null);
  }

  const costDialogOpen = addingCost || editingCost !== null;
  function closeCostDialog() {
    setAddingCost(false);
    setEditingCost(null);
    setTransportCostDefaults(false);
  }

  async function handleDeleteStop() {
    setDeleteStopError(null);
    try {
      await deleteStop.mutateAsync(stopId);
      router.push(`/trips/${tripId}/route`);
    } catch (err) {
      setDeleteStopError(
        err instanceof Error ? err.message : "Couldn't delete that stop — try again.",
      );
    }
  }

  async function handleDeleteTip() {
    if (!editingTip) return;
    setDeleteTipError(null);
    try {
      await deleteTip.mutateAsync(editingTip.id);
      setConfirmingDeleteTip(false);
      closeTipDialog();
    } catch (err) {
      setDeleteTipError(
        err instanceof Error ? err.message : "Couldn't delete that tip — try again.",
      );
    }
  }

  async function handleDeleteCost() {
    if (!editingCost) return;
    setDeleteCostError(null);
    try {
      await deleteCost.mutateAsync(editingCost.id);
      setConfirmingDeleteCost(false);
      closeCostDialog();
    } catch (err) {
      setDeleteCostError(
        err instanceof Error ? err.message : "Couldn't delete that cost — try again.",
      );
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1>Edit {stop.name}</h1>

        <StopLogisticsForm
          tripId={tripId}
          stop={stop}
          transportModes={trip?.transport_modes ?? []}
          onDone={() => setEditing(false)}
        />

        <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
          Done
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirmingDeleteStop(true)}
        >
          <Trash weight="duotone" size={20} />
          Delete stop
        </Button>

        <DeleteConfirmDialog
          open={confirmingDeleteStop}
          onClose={() => setConfirmingDeleteStop(false)}
          onConfirm={handleDeleteStop}
          title="Delete this stop?"
          description={`This stop has ${stopPlaces.length} place${stopPlaces.length === 1 ? "" : "s"} and ${stopCosts.length} cost${stopCosts.length === 1 ? "" : "s"} linked — they'll stay, just unassigned from any stop. This can't be undone.`}
          pending={deleteStop.isPending}
          error={deleteStopError}
        />
      </div>
    );
  }

  const overviewContent = (
    <div className="flex flex-col gap-4">
      {(stop.start_date || stop.arrival_time) && (
        <div>
          {stop.start_date && (
            <p className="text-muted">
              {new Date(stop.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {stop.end_date && stop.end_date !== stop.start_date &&
                ` – ${new Date(stop.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </p>
          )}
          {stop.arrival_time && (
            <p className="text-muted">
              Arriving{" "}
              {new Date(stop.arrival_time).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      )}

      <CheckInControl
        tripId={tripId}
        stop={stop}
        checkins={checkins}
        onCheckedIn={() => setDefaultDetailTab("places")}
      />

      {(stop.transport_mode || stop.transport_detail || stop.departure_point || stop.arrival_point) && (
        <div className="flex flex-col gap-1">
          <h2>Getting here</h2>
          {stop.transport_mode && (
            <Tag variant="neutral">
              <span className="flex items-center gap-1">
                <TransportModeIcon mode={stop.transport_mode} />
                {stop.transport_mode}
              </span>
            </Tag>
          )}
          {stop.transport_detail && <p>{stop.transport_detail}</p>}
          {(stop.departure_point || stop.arrival_point) && (
            <p className="text-muted">
              {stop.departure_point ?? "?"} → {stop.arrival_point ?? "?"}
            </p>
          )}
          {stop.transport_cost_status && (
            <p className="text-muted">
              Cost: {COST_STATUS_LABEL[stop.transport_cost_status]}
            </p>
          )}
        </div>
      )}

      {accommodationPlaces.length > 0 && (
        <div className="flex flex-col gap-1">
          <h2>Staying at</h2>
          {accommodationPlaces.map((place) => (
            <Link key={place.id} href={`/trips/${tripId}/places/${place.id}`}>
              {place.name}
            </Link>
          ))}
        </div>
      )}

      {(stop.guide_info || stop.flight_info) && (
        <div className="flex flex-col gap-1">
          {stop.guide_info && <p className="text-muted">Guide: {stop.guide_info}</p>}
          {stop.flight_info && <p className="text-muted">Flight: {stop.flight_info}</p>}
        </div>
      )}

      {stop.description && (
        <div className="flex flex-col gap-2">
          <h2>Day by day</h2>
          {splitDayNarrative(stop.description).map((chunk, i) => (
            <p key={i}>{chunk}</p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <LocationMapLoader lat={stop.lat} lng={stop.lng} title={stop.name} />
        <OpenInGoogleMapsLink lat={stop.lat} lng={stop.lng} />
      </div>
    </div>
  );

  const placesContent = (
    <div className="flex flex-col gap-3">
      {stopPlaces.length === 0 ? (
        <p className="text-muted">No places at this stop yet.</p>
      ) : (
        stopPlaces.map((place) => (
          <Card key={place.id}>
            <CardTitle>
              <Link href={`/trips/${tripId}/places/${place.id}`}>{place.name}</Link>
            </CardTitle>
            {place.town && <CardMeta>{place.town}</CardMeta>}
            {(place.is_accommodation || place.meal_tags.length > 0) && (
              <CardMeta>
                <div className="flex flex-wrap gap-2">
                  {place.is_accommodation && <Tag variant="neutral">Accommodation</Tag>}
                  {place.meal_tags.map((tag) => (
                    <Tag key={tag} variant="neutral">
                      {MEAL_TAG_LABEL[tag]}
                    </Tag>
                  ))}
                </div>
              </CardMeta>
            )}
          </Card>
        ))
      )}
    </div>
  );

  const tipsContent = (
    <div className="flex flex-col gap-3">
      {stopTips.length === 0 ? (
        <p className="text-muted">No tips for this stop yet.</p>
      ) : (
        stopTips.map((tip) => (
          <TipCard
            key={tip.id}
            tip={tip}
            relatedPlaceName={
              tip.related_place_id ? placeNameById.get(tip.related_place_id) : undefined
            }
            onEdit={() => setEditingTip(tip)}
          />
        ))
      )}
    </div>
  );

  const costsContent = (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setTransportCostDefaults(true);
          setAddingCost(true);
        }}
      >
        Log transport cost
      </Button>
      {stopCosts.length === 0 ? (
        <p className="text-muted">No costs logged for this stop yet.</p>
      ) : (
        stopCosts.map((line) => (
          <CostLineRow
            key={line.id}
            tripId={tripId}
            line={line}
            onEdit={() => setEditingCost(line)}
          />
        ))
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-2">
        <h1>{stop.name}</h1>
        <Button
          type="button"
          variant="ghost"
          icon
          onClick={() => setEditing(true)}
          aria-label="Edit stop"
        >
          <PencilSimple weight="duotone" size={20} />
        </Button>
      </div>
      {stop.town && <p className="text-muted">{stop.town}</p>}

      <DetailTabs
        key={defaultDetailTab}
        defaultTab={defaultDetailTab}
        tabs={[
          { key: "overview", label: "Overview", content: overviewContent },
          { key: "places", label: "Places", content: placesContent },
          {
            key: "tips",
            label: "Tips",
            content: tipsContent,
            onAdd: () => setAddingTip(true),
            addLabel: "Add a tip",
          },
          {
            key: "costs",
            label: "Costs",
            content: costsContent,
            onAdd: () => setAddingCost(true),
            addLabel: "Log a cost",
          },
        ]}
      />

      <Dialog
        open={tipDialogOpen}
        onClose={closeTipDialog}
        title={editingTip ? "Edit tip" : "Add a tip"}
      >
        <div className="flex flex-col gap-4">
          <TipForm
            tripId={tripId}
            categories={trip?.tip_categories ?? []}
            tip={editingTip ?? undefined}
            initialRelatedStopId={editingTip ? undefined : stopId}
            onDone={closeTipDialog}
          />
          {editingTip && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmingDeleteTip(true)}
            >
              <Trash weight="duotone" size={20} />
              Delete tip
            </Button>
          )}
        </div>
      </Dialog>

      <DeleteConfirmDialog
        open={confirmingDeleteTip}
        onClose={() => setConfirmingDeleteTip(false)}
        onConfirm={handleDeleteTip}
        title="Delete this tip?"
        description="This can't be undone."
        pending={deleteTip.isPending}
        error={deleteTipError}
      />

      <Dialog
        open={costDialogOpen}
        onClose={closeCostDialog}
        title={
          editingCost
            ? "Edit cost"
            : transportCostDefaults
              ? "Log transport cost"
              : "Log a cost"
        }
      >
        <div className="flex flex-col gap-4">
          <BudgetForm
            tripId={tripId}
            categories={trip?.budget_categories ?? []}
            currencies={trip?.currencies ?? []}
            line={editingCost ?? undefined}
            initialValues={
              transportCostDefaults
                ? {
                    stop_id: stopId,
                    category: trip?.budget_categories.includes("Transit")
                      ? "Transit"
                      : undefined,
                    description: `${stop.transport_mode ?? "Transport"} to ${stop.name}`,
                  }
                : { stop_id: stopId }
            }
            onDone={closeCostDialog}
          />
          {editingCost && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmingDeleteCost(true)}
            >
              <Trash weight="duotone" size={20} />
              Delete cost
            </Button>
          )}
        </div>
      </Dialog>

      <DeleteConfirmDialog
        open={confirmingDeleteCost}
        onClose={() => setConfirmingDeleteCost(false)}
        onConfirm={handleDeleteCost}
        title="Delete this cost?"
        description="This can't be undone."
        pending={deleteCost.isPending}
        error={deleteCostError}
      />
    </div>
  );
}
