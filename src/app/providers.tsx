"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toast";
import { SyncStatusBanner } from "@/components/ui/SyncStatusBanner";
import { SyncQueueListener } from "@/lib/offline/sync-provider";
import { ServiceWorkerRegistration } from "@/lib/offline/ServiceWorkerRegistration";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ServiceWorkerRegistration />
        <SyncQueueListener />
        <SyncStatusBanner />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
