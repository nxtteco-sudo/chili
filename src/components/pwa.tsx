"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

const DISMISS_KEY = "install-hint-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Shows "Install app" on Android/desktop Chrome, and Add-to-Home-Screen steps on iPhone.
export function InstallHint({ always = false }: { always?: boolean }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    // Reading browser-only state after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setHidden(!always && readDismissed());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [always]);

  if (hidden || (!event && !ios && !always)) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-accent-soft p-4">
      <Smartphone className="mt-0.5 size-5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1 text-[15px]">
        <p className="font-medium">Install as an app</p>
        {event ? (
          <p className="mt-0.5 text-ink-2">Get a Kebun Cili icon on your home screen.</p>
        ) : ios ? (
          <p className="mt-0.5 text-ink-2">
            In Safari, tap <Share className="inline size-4 align-[-3px]" /> Share, then{" "}
            <b>Add to Home Screen</b>.
          </p>
        ) : (
          <p className="mt-0.5 text-ink-2">
            In Chrome, open the <b>⋮</b> menu and tap <b>Install app</b> or{" "}
            <b>Add to Home screen</b>.
          </p>
        )}
        {event && (
          <button
            onClick={async () => {
              await event.prompt();
              setEvent(null);
              dismiss();
            }}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-ink"
          >
            <Download className="size-4" /> Install
          </button>
        )}
      </div>
      {!always && (
        <button onClick={dismiss} aria-label="Dismiss" className="-m-2 grid size-11 shrink-0 place-items-center text-muted hover:text-ink">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
