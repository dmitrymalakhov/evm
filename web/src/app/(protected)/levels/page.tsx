"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useLevelStore } from "@/store/use-level-store";
import { useSessionStore } from "@/store/use-session-store";
import { ConsoleFrame } from "@/components/ui/console-frame";

export default function LevelsPage() {
  const router = useRouter();
  const { user } = useSessionStore();
  const { currentLevel, loadLevel, isLoading, error } = useLevelStore();
  const hasRedirected = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadAndRedirect() {
      if (hasRedirected.current) return;

      try {
        await loadLevel({ teamId: user?.teamId });
      } catch (error) {
        console.error("Failed to load level:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Не удалось загрузить активную неделю"
        );
      }
    }
    void loadAndRedirect();
  }, [user?.teamId, loadLevel]);

  useEffect(() => {
    if (currentLevel?.week && !hasRedirected.current && !isLoading) {
      hasRedirected.current = true;
      router.replace(`/levels/${currentLevel.week}`);
    } else if (!isLoading && !currentLevel && !hasRedirected.current && !error) {
      // Небольшая задержка перед показом ошибки, чтобы дать время на загрузку
      const timer = setTimeout(() => {
        if (!currentLevel && !isLoading) {
          setErrorMessage("Активная неделя не найдена. Убедитесь, что в системе настроена итерация с активной неделей и уровень для этой недели.");
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentLevel?.week, router, isLoading, currentLevel, error]);

  if (error || errorMessage) {
    return (
      <div className="space-y-8">
        <ConsoleFrame className="border-evm-accent/30 bg-evm-accent/5 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-evm-accent mb-2">
            Активная неделя не найдена
          </p>
        </ConsoleFrame>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ConsoleFrame className="flex h-[420px] items-center justify-center text-xs uppercase tracking-[0.24em] text-evm-muted">
        {isLoading ? "Загрузка активной недели..." : "Перенаправление на активную неделю..."}
      </ConsoleFrame>
    </div>
  );
}

