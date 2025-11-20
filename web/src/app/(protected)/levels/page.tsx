"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { useLevelStore } from "@/store/use-level-store";
import { useSessionStore } from "@/store/use-session-store";
import { ConsoleFrame } from "@/components/ui/console-frame";

export default function LevelsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSessionStore();
  const { currentLevel, loadLevel, isLoading, error, reset } = useLevelStore();
  const hasRedirected = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Сбрасываем состояние при монтировании или при каждом переходе на эту страницу
    reset();
    hasRedirected.current = false;
    setErrorMessage(null);
  }, [pathname, reset]);

  useEffect(() => {
    async function loadAndRedirect() {
      if (hasRedirected.current) return;

      try {
        console.log("[LevelsPage] Loading level for user:", user?.id, "teamId:", user?.teamId);
        await loadLevel({ teamId: user?.teamId });
      } catch (error) {
        console.error("[LevelsPage] Failed to load level:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Не удалось загрузить активную неделю"
        );
      }
    }
    // Load level even if user doesn't have teamId - it's not required for getting current level
    if (user) {
      void loadAndRedirect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
            Активные задания недоступны
          </p>
          {(error || errorMessage) && (
            <p className="text-xs text-evm-muted mt-2">
              {error || errorMessage}
            </p>
          )}
        </ConsoleFrame>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ConsoleFrame className="flex h-[420px] items-center justify-center text-xs uppercase tracking-[0.24em] text-evm-muted">
        {isLoading ? "Загружаем карточки заданий..." : "Перенаправляем к активным заданиям..."}
      </ConsoleFrame>
    </div>
  );
}

