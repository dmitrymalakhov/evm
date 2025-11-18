"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { TaskCard } from "@/components/level/task-card";
import { useLevelStore } from "@/store/use-level-store";
import { useSessionStore } from "@/store/use-session-store";
import { useTeamStore } from "@/store/use-team-store";
import { ProgressBar } from "@/components/progress-bar";
import { ConsoleFrame } from "@/components/ui/console-frame";
import { TeletypeText } from "@/components/ui/teletype-text";
import { api } from "@/services/api";
import { Timer } from "@/components/timer";

export default function LevelWeekPage() {
  const params = useParams<{ week: string }>();
  const router = useRouter();
  const weekNumber = useMemo(
    () => Number(params?.week ?? 0),
    [params?.week],
  );
  const { user } = useSessionStore();
  const { currentLevel, tasks, isLoading, loadLevel, submitTask, unlockedKeys } = useLevelStore();
  const { progress } = useTeamStore();

  const reloadLevel = useCallback(() => {
    if (Number.isNaN(weekNumber) || weekNumber <= 0) {
      void loadLevel({ teamId: user?.teamId });
      return;
    }
    void loadLevel({ week: weekNumber, teamId: user?.teamId });
  }, [weekNumber, user?.teamId, loadLevel]);

  useEffect(() => {
    reloadLevel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekNumber, user?.teamId]);

  // Reload level data when page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reloadLevel();
      }
    };

    const handleFocus = () => {
      reloadLevel();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [reloadLevel]);

  async function handleSubmit(
    taskId: string,
    payload: {
      photos?: string[];
      survey?: Record<string, string>;
      text?: string;
    },
  ) {
    try {
      // Validate that photos are provided if task requires them
      if (payload.photos && payload.photos.length === 0) {
        throw new Error("Необходимо загрузить хотя бы одно фото");
      }

      const response = await submitTask(taskId, payload);
      toast.success("Задание отправлено на модерацию", {
        description: response.message ?? "Ожидайте проверки администратором.",
      });
    } catch (error) {
      console.error("Task submission error:", error);
      toast.error("Не удалось отправить задание", {
        description:
          error instanceof Error ? error.message : "Неизвестная ошибка матрицы",
      });
      // Re-throw error so form can handle it
      throw error;
    }
  }

  const storyline =
    typeof currentLevel?.config?.storyline === "string"
      ? currentLevel.config.storyline
      : "";
  const { totalTasks, completedTasksCount, pendingTasksCount, completionPercent } = useMemo(() => {
    const completedIds = new Set(progress?.completedTasks ?? []);
    const total = tasks.length;
    const done = tasks.reduce((acc, task) => (completedIds.has(task.id) ? acc + 1 : acc), 0);
    return {
      totalTasks: total,
      completedTasksCount: done,
      pendingTasksCount: Math.max(total - done, 0),
      completionPercent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [progress?.completedTasks, tasks]);
  const hasStoryline = storyline.trim().length > 0;

  const activeWeek = currentLevel?.iteration?.currentWeek;
  const totalWeeks = currentLevel?.iteration?.totalWeeks ?? 0;
  const currentWeek = weekNumber || currentLevel?.week || 0;
  const closesAtTarget =
    currentLevel?.closesAt ?? new Date(Date.now() + 86_400_000).toISOString();
  const totalKeySlots = currentLevel?.iteration?.totalWeeks ?? 6;
  const unlockedKeyCount = unlockedKeys.length;
  const isActiveWeek = activeWeek === currentWeek;
  const isLevelOpen = currentLevel?.state === "open";

  // Проверяем, не изменилась ли активная неделя, и перенаправляем если нужно
  useEffect(() => {
    if (!isLoading && currentLevel && activeWeek && activeWeek !== weekNumber && weekNumber > 0) {
      // Активная неделя изменилась, перенаправляем на новую активную неделю
      router.replace(`/levels/${activeWeek}`);
    }
  }, [activeWeek, weekNumber, isLoading, currentLevel, router]);

  // Периодически проверяем актуальную активную неделю (каждые 5 секунд)
  useEffect(() => {
    if (!user?.teamId || weekNumber <= 0) return;

    const interval = setInterval(async () => {
      try {
        // Загружаем текущий уровень, чтобы получить актуальную активную неделю
        const currentLevelData = await api.getCurrentLevel();
        if (currentLevelData?.iteration?.currentWeek &&
          currentLevelData.iteration.currentWeek !== weekNumber) {
          // Активная неделя изменилась, перенаправляем
          router.replace(`/levels/${currentLevelData.iteration.currentWeek}`);
        }
      } catch (error) {
        // Игнорируем ошибки при проверке
        console.error("Failed to check active week:", error);
      }
    }, 5000); // Проверяем каждые 5 секунд

    return () => clearInterval(interval);
  }, [user?.teamId, weekNumber, router]);

  const handleWeekNavigation = (direction: "prev" | "next") => {
    if (direction === "prev" && currentWeek > 1) {
      router.push(`/levels/${currentWeek - 1}`);
    } else if (direction === "next" && currentWeek < totalWeeks) {
      router.push(`/levels/${currentWeek + 1}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <ConsoleFrame className="flex h-[420px] items-center justify-center text-xs uppercase tracking-[0.24em] text-evm-muted">
          Загрузка уровня...
        </ConsoleFrame>
      </div>
    );
  }

  if (!currentLevel) {
    return (
      <div className="space-y-8">
        <ConsoleFrame className="text-sm uppercase tracking-[0.2em] text-evm-muted">
          Уровень не найден.
        </ConsoleFrame>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
                Неделя {currentWeek}
              </p>
              {isActiveWeek && (
                <div className="rounded-md border border-evm-accent/50 bg-evm-accent/10 px-3 py-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-evm-accent">
                    Текущая неделя
                  </p>
                </div>
              )}
              {currentLevel.state === "open" && (
                <div className="rounded-md border border-evm-matrix/50 bg-evm-matrix/10 px-3 py-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-evm-matrix">
                    Задания открыты
                  </p>
                </div>
              )}
              {currentLevel.state === "closed" && (
                <div className="rounded-md border border-evm-steel/50 bg-evm-steel/10 px-3 py-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-evm-muted">
                    Задания закрыты
                  </p>
                </div>
              )}
            </div>
            <h2 className="text-3xl font-semibold uppercase tracking-[0.28em]">
              Карточки заданий
            </h2>
            <p className="text-xs uppercase tracking-[0.18em] text-evm-muted max-w-xl">
              Здесь собраны все задания недели. Открывайте карточки, чтобы прочитать условия и отправить решение.
            </p>
          </div>

        </div>

        <div className={`grid gap-6 ${hasStoryline ? "lg:grid-cols-[3fr_2fr]" : ""}`}>
          <ConsoleFrame className="p-6 space-y-6">
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
                  Монитор задач
                </p>
                <p className="text-sm text-evm-muted/80">
                  Обновляем статус карточек в режиме реального времени.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-3xl font-semibold">{totalTasks > 0 ? totalTasks : "—"}</p>
                  <p className="mt-1 text-[0.65rem] uppercase tracking-[0.24em] text-evm-muted">
                    Всего заданий
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-evm-matrix">{completedTasksCount}</p>
                  <p className="mt-1 text-[0.65rem] uppercase tracking-[0.24em] text-evm-muted">
                    Выполнено
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-evm-accent">{pendingTasksCount}</p>
                  <p className="mt-1 text-[0.65rem] uppercase tracking-[0.24em] text-evm-muted">
                    В ожидании
                  </p>
                </div>
              </div>
              <ProgressBar value={completionPercent} label="Прогресс по заданиям" />
              <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                После отправки решения карточка автоматически обновится.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-evm-steel/40 bg-black/20 p-4">
                <Timer target={closesAtTarget} label="До конца недели" />
              </div>
              <div className="rounded-md border border-evm-accent/30 bg-evm-accent/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
                  Открытые ключи
                </p>
                <p className="mt-2 text-3xl font-semibold text-evm-accent">
                  {unlockedKeyCount > 0 ? unlockedKeyCount : "—"}
                </p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.24em] text-evm-muted">
                  {totalKeySlots > 0 ? `из ${totalKeySlots}` : "без ограничения"}
                </p>
              </div>
            </div>
          </ConsoleFrame>

          {hasStoryline && (
            <ConsoleFrame className="p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-evm-muted mb-3">
                Бриф недели
              </p>
              <TeletypeText
                text={storyline}
                className="text-sm leading-relaxed text-foreground"
              />
            </ConsoleFrame>
          )}
        </div>
      </div>

      {currentLevel.config.hint && (
        <ConsoleFrame className="border-evm-accent/30 bg-evm-accent/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-evm-accent">
            Подсказка:
          </p>
          <p className="mt-2 text-sm text-foreground">{currentLevel.config.hint}</p>
        </ConsoleFrame>
      )}

      {!isLevelOpen && (
        <ConsoleFrame className="border-evm-steel/30 bg-evm-steel/5 p-4">
          <p className="text-sm uppercase tracking-[0.2em] text-evm-muted">
            Эта неделя закрыта. Задачи недоступны.
          </p>
        </ConsoleFrame>
      )}

      {isLevelOpen && (
        <div className="grid gap-6 lg:grid-cols-2">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onSubmit={(payload) => handleSubmit(task.id, payload)}
              onUploadFiles={api.uploadFiles}
            />
          ))}
          {tasks.length === 0 && (
            <ConsoleFrame className="text-sm uppercase tracking-[0.2em] text-evm-muted">
              Карточки заданий скоро появятся — следите за обновлениями.
            </ConsoleFrame>
          )}
        </div>
      )}
    </div>
  );
}

