"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle } from "@phosphor-icons/react";

interface ToastItem {
  id: number;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3000;

// App-wide, since toasts originate from mutation call sites scattered across
// the tree (PhotoUpload, EmbedLinkInput, and future ones) but render in one
// place — a genuine Context case per CONVENTIONS.md §2, not local state.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-4"
        aria-live="polite"
        role="status"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-2 rounded-[var(--radius-lg)] px-4 py-2 shadow-[var(--shadow-lg)]"
            style={{
              background: "var(--color-accent-100)",
              color: "var(--color-accent-800)",
            }}
          >
            <CheckCircle weight="duotone" size={20} />
            <span className="text-sm">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
