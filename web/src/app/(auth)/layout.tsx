import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(184,71,63,0.18),transparent_60%)]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.75)_0%,rgba(5,6,7,0.95)_45%,rgba(5,6,7,1)_100%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        {children}
      </div>
    </div>
  );
}

