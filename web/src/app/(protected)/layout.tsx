"use client";

import { ReactNode } from "react";

import { SessionGate } from "@/components/auth/session-gate";
import { AppShell } from "@/components/layout/app-shell";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGate>
      <AppShell>{children}</AppShell>
    </SessionGate>
  );
}

