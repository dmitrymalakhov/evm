"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { useSessionStore } from "@/store/use-session-store";

export function Topbar() {
  const { user, logout } = useSessionStore();

  return (
    <header className="flex h-20 items-center justify-between border-b border-evm-steel/30 bg-black/40 px-8">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-evm-muted">
          Системный статус
        </p>
        <div className="mt-2 flex items-center gap-3 text-sm uppercase tracking-[0.22em] text-evm-matrix">
          <span className="flex h-2 w-2 rounded-full bg-evm-matrix shadow-[0_0_8px_rgba(8,200,112,0.8)]" />
          Матрица активна
          <Badge variant="outline">Версия 0.1.0</Badge>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/feed">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Уведомления</span>
          </Link>
        </Button>
        <ThemeSwitcher />
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-evm-steel/40">
            <Image
              src={user?.avatarUrl ?? "/avatars/op17.png"}
              alt={user?.name ?? "Профиль"}
              fill
              sizes="40px"
            />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium uppercase tracking-[0.2em]">
              {user?.name ?? "Оператор"}
            </p>
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-evm-muted">
              {user?.title ?? "Ранг не присвоен"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={logout}>
          <Power className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

