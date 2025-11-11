"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ConsoleFrame } from "@/components/ui/console-frame";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/use-session-store";

type SessionGateProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

export function SessionGate({
  children,
  redirectTo = "/login",
}: SessionGateProps) {
  const router = useRouter();
  const { user, isLoading, hasHydrated, loadProfile, error } =
    useSessionStore();

  useEffect(() => {
    if (!hasHydrated && !isLoading) {
      void loadProfile();
    }
  }, [hasHydrated, isLoading, loadProfile]);

  useEffect(() => {
    if (!isLoading && hasHydrated && !user) {
      router.push(redirectTo);
    }
  }, [hasHydrated, isLoading, user, router, redirectTo]);

  if (isLoading || !hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ConsoleFrame className="w-[360px] text-center">
          <h2 className="text-xs uppercase tracking-[0.28em] text-evm-muted">
            ИНИЦИАЛИЗАЦИЯ ЯДРА
          </h2>
          <p className="mt-4 text-sm uppercase tracking-[0.24em] text-foreground">
            Загрузка профиля оператора...
          </p>
        </ConsoleFrame>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ConsoleFrame className="w-[360px] space-y-4 text-center">
          <div className="text-xs uppercase tracking-[0.28em] text-evm-accent">
            Ошибка доступа
          </div>
          <p className="text-sm text-evm-muted">{error}</p>
          <Button onClick={() => loadProfile()}>Повторить</Button>
        </ConsoleFrame>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

