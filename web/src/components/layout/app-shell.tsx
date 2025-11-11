import { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-[290px] lg:block">
        <Sidebar />
      </div>
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-8 py-10">{children}</main>
        <footer className="border-t border-evm-steel/30 bg-black/40 px-8 py-6 text-xs uppercase tracking-[0.32em] text-evm-muted">
          Проект ЁЛКА, 1977 → 2077. Электронно-вычислительная матрица.
        </footer>
      </div>
    </div>
  );
}

