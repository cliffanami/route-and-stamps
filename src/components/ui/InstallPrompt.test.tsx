import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstallPrompt } from "./InstallPrompt";

function mockMatchMedia(standalone: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: standalone });
}

// window.dispatchEvent is a raw DOM call, outside React's own event
// handling — wrapping in act() ensures the resulting setState is flushed
// before the assertion runs, same as RTL's own fireEvent/userEvent do
// automatically for synthetic events.
function fireBeforeInstallPrompt() {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: "accepted" });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe("InstallPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing until beforeinstallprompt fires", () => {
    const { container } = render(<InstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the banner once beforeinstallprompt fires", () => {
    render(<InstallPrompt />);
    fireBeforeInstallPrompt();
    expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
  });

  it("never shows when already running standalone", () => {
    mockMatchMedia(true);
    render(<InstallPrompt />);
    fireBeforeInstallPrompt();
    expect(screen.queryByRole("button", { name: "Install" })).not.toBeInTheDocument();
  });

  it("hides and records a timestamp when dismissed", async () => {
    const user = userEvent.setup();
    render(<InstallPrompt />);
    fireBeforeInstallPrompt();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByRole("button", { name: "Install" })).not.toBeInTheDocument();
    expect(localStorage.getItem("install-prompt-dismissed-at")).not.toBeNull();
  });

  it("doesn't show again within 24h of being dismissed", () => {
    localStorage.setItem("install-prompt-dismissed-at", String(Date.now()));
    render(<InstallPrompt />);
    fireBeforeInstallPrompt();
    expect(screen.queryByRole("button", { name: "Install" })).not.toBeInTheDocument();
  });

  it("shows again once the dismissal cooldown has passed", () => {
    localStorage.setItem(
      "install-prompt-dismissed-at",
      String(Date.now() - 25 * 60 * 60 * 1000),
    );
    render(<InstallPrompt />);
    fireBeforeInstallPrompt();
    expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
  });

  it("calls prompt() and hides the banner when Install is clicked", async () => {
    const user = userEvent.setup();
    render(<InstallPrompt />);
    const event = fireBeforeInstallPrompt();

    await user.click(screen.getByRole("button", { name: "Install" }));

    expect(event.prompt).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Install" })).not.toBeInTheDocument();
  });
});
