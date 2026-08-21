import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PushNotificationSettings } from "./PushNotificationSettings";
import type { Profile } from "@/types/database.types";

const mutateAsync = vi.fn().mockResolvedValue(undefined);
const mutate = vi.fn();
let statusData: { subscribed: boolean; supported: boolean } | undefined = {
  subscribed: false,
  supported: true,
};

vi.mock("@/lib/queries/use-push-subscription", () => ({
  usePushSubscriptionStatus: () => ({ data: statusData, isLoading: false }),
  useEnablePush: () => ({ mutateAsync, isPending: false }),
  useDisablePush: () => ({ mutateAsync, isPending: false }),
}));

vi.mock("@/lib/queries/use-profile", () => ({
  useUpdatePushEnabledTypes: () => ({ mutate }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    id: "user-1",
    display_name: "Test User",
    avatar_url: null,
    push_enabled_types: ["consensus_reached", "arrival_estimated", "packing_due", "trip_joined"],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("PushNotificationSettings", () => {
  it("shows an unsupported message when push isn't supported", () => {
    statusData = { subscribed: false, supported: false };
    render(<PushNotificationSettings profile={makeProfile({})} />);
    expect(screen.getByText(/aren.t supported/)).toBeInTheDocument();
  });

  it("shows an enable button when not subscribed on this device", () => {
    statusData = { subscribed: false, supported: true };
    render(<PushNotificationSettings profile={makeProfile({})} />);
    expect(
      screen.getByRole("button", { name: /enable notifications on this device/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Send a push for:")).not.toBeInTheDocument();
  });

  it("shows the per-type checklist reflecting push_enabled_types when subscribed", () => {
    statusData = { subscribed: true, supported: true };
    render(
      <PushNotificationSettings
        profile={makeProfile({ push_enabled_types: ["trip_joined"] })}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Someone joined the trip" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "New place added" })).not.toBeChecked();
  });

  it("saves the toggled type list when a checkbox is clicked", async () => {
    statusData = { subscribed: true, supported: true };
    const user = userEvent.setup();
    render(
      <PushNotificationSettings
        profile={makeProfile({ push_enabled_types: ["trip_joined"] })}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "New place added" }));

    expect(mutate).toHaveBeenCalledWith(["trip_joined", "place_added"]);
  });

  it("calls enablePush when the toggle button is clicked while unsubscribed", async () => {
    statusData = { subscribed: false, supported: true };
    const user = userEvent.setup();
    render(<PushNotificationSettings profile={makeProfile({})} />);

    await user.click(screen.getByRole("button", { name: /enable notifications on this device/i }));

    expect(mutateAsync).toHaveBeenCalled();
  });
});
