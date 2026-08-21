"use client";

import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import { Button } from "./Button";

// Chrome's actual event shape — not in the standard TS lib.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "install-prompt-dismissed-at";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Android/Chrome only — beforeinstallprompt has no iOS equivalent (no
// programmatic "add to home screen" API there at all), same platform
// split as Web Share Target. Shows once per browser-tab visit; dismissing
// goes quiet for 24h rather than reappearing on every page load, since
// this app is used by exactly two people who'll notice it either way —
// no need to be more insistent than that.
export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
      if (Date.now() - dismissedAt < COOLDOWN_MS) return;

      setPromptEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function handleAppInstalled() {
      setVisible(false);
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between gap-2 p-3" style={{ background: "var(--color-surface)" }}>
      <p className="text-muted">Install Route &amp; Stamps for quick access from your home screen.</p>
      <div className="flex items-center gap-1">
        <Button type="button" variant="secondary" onClick={install}>
          Install
        </Button>
        <Button type="button" variant="ghost" icon onClick={dismiss} aria-label="Dismiss">
          <X weight="bold" size={16} />
        </Button>
      </div>
    </div>
  );
}
