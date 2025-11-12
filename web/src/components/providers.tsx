 "use client";

import { ReactNode } from "react";
import { Toaster } from "sonner";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
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

