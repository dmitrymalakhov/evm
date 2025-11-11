 "use client";

import { ReactNode, useEffect } from "react";
import { Toaster } from "sonner";

import { startMockServiceWorker } from "@/msw/browser";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    startMockServiceWorker().catch((error) => {
      // eslint-disable-next-line no-console
      console.warn("Failed to start MSW", error);
    });
  }, []);

  return (
    <>
      {children}
      <div className="noise-overlay" />
      <Toaster
        position="top-right"
        closeButton
        theme="dark"
        toastOptions={{
          className: "crt-frame border border-evm-accent/30 bg-black/80",
        }}
      />
    </>
  );
}

