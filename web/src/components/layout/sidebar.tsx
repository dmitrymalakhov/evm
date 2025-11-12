"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LucideProps, Shield } from "lucide-react";

import { NAV_LINKS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/use-session-store";

export function Sidebar() {
  const pathname = usePathname();
  const { user, featureFlags } = useSessionStore();

  return (
    <aside className="flex h-full flex-col border-r border-evm-steel/30 bg-black/30 px-5 py-6">
      <div className="mb-12 space-y-2">
        <div className="text-xs uppercase tracking-[0.38em] text-evm-muted">
          Цифровая сеть
        </div>
        <motion.h1
          className="text-glitch text-2xl font-semibold uppercase tracking-[0.32em]"
          data-text="E.V.M."
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          E.V.M.
        </motion.h1>
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-evm-muted">
          ПРОЕКТ ЁЛКА • 1977 → 2077
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_LINKS.map((item) => {
          const Icon = item.icon as React.ComponentType<LucideProps>;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold uppercase tracking-[0.22em] transition-all",
                isActive
                  ? "bg-evm-accent/15 text-evm-accent"
                  : "text-evm-muted hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-evm-accent" : "text-evm-muted",
                )}
              />
              {item.label}
              {isActive ? (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 -z-10 rounded-md border border-evm-accent/50 shadow-[0_0_12px_rgba(184,71,63,0.35)]"
                  transition={{ duration: 0.2 }}
                />
              ) : null}
            </Link>
          );
        })}
        {(user?.role === "admin" || featureFlags.admin) && (
          <Link
            href="/admin"
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold uppercase tracking-[0.22em] transition-all",
              pathname.startsWith("/admin")
                ? "bg-evm-accent/15 text-evm-accent"
                : "text-evm-muted hover:bg-white/5 hover:text-foreground",
            )}
          >
            <Shield
              className={cn(
                "h-4 w-4 transition-colors",
                pathname.startsWith("/admin") ? "text-evm-accent" : "text-evm-muted",
              )}
            />
            Admin
            {pathname.startsWith("/admin") ? (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 -z-10 rounded-md border border-evm-accent/50 shadow-[0_0_12px_rgba(184,71,63,0.35)]"
                transition={{ duration: 0.2 }}
              />
            ) : null}
          </Link>
        )}
      </nav>

      <div className="rounded-md border border-evm-steel/50 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
          Состояние ядра
        </p>
        <p className="mt-2 text-sm font-semibold tracking-[0.16em] text-evm-matrix">
          {featureFlags.realtime ? "ОНЛАЙН • ПУЛЬС НОРМАЛЬНЫЙ" : "ИНЖЕКЦИИ ВЫКЛ"}
        </p>
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-evm-muted">
          {user?.name} / {user?.title ?? "Без ранга"}
        </p>
      </div>
    </aside>
  );
}

