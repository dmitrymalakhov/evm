"use client";

import { useEffect, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";

export default function LevelWeekPage() {
  const params = useParams<{ week: string }>();
  const router = useRouter();
  const weekNumber = useMemo(
    () => Number(params?.week ?? 0),
    [params?.week],
  );
  const { user } = useSessionStore();
  const { currentLevel, tasks, isLoading, loadLevel, submitTask } = useLevelStore();
  const { progress } = useTeamStore();

  useEffect(() => {
    if (Number.isNaN(weekNumber) || weekNumber <= 0) {
      void loadLevel({ teamId: user?.teamId });
      return;
    }
    void loadLevel({ week: weekNumber, teamId: user?.teamId });
  }, [weekNumber, user?.teamId, loadLevel]);

  async function handleSubmit(
    taskId: string,
    payload: {
      photos?: string[];
      survey?: Record<string, string>;
      text?: string;
    },
  ) {
    try {
      const response = await submitTask(taskId, payload);
      toast.success("Задание отправлено на модерацию", {
        description: response.message ?? "Ожидайте проверки администратором.",
      });
    } catch (error) {
      toast.error("Не удалось отправить задание", {
        description:
          error instanceof Error ? error.message : "Неизвестная ошибка матрицы",
      });
    }
  }

  const storyline =
    currentLevel?.config?.storyline ??
    "Матрица подготавливает данные о текущем уровне.";

  const activeWeek = currentLevel?.iteration?.currentWeek;
  const totalWeeks = currentLevel?.iteration?.totalWeeks ?? 0;
  const currentWeek = weekNumber || currentLevel?.week || 0;
  const isActiveWeek = activeWeek === currentWeek;
  const isLevelOpen = currentLevel?.state === "open";

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
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
                Уровень {currentWeek}
              </p>
              {isActiveWeek && (
                <div className="rounded-md border border-evm-accent/50 bg-evm-accent/10 px-3 py-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-evm-accent">
                    Активная неделя
                  </p>
                </div>
              )}
              {currentLevel.state === "open" && (
                <div className="rounded-md border border-evm-matrix/50 bg-evm-matrix/10 px-3 py-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-evm-matrix">
                    Открыта
                  </p>
                </div>
              )}
              {currentLevel.state === "closed" && (
                <div className="rounded-md border border-evm-steel/50 bg-evm-steel/10 px-3 py-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-evm-muted">
                    Закрыта
                  </p>
                </div>
              )}
            </div>
            <h2 className="text-3xl font-semibold uppercase tracking-[0.28em]">
              {currentLevel.title}
            </h2>
          </div>
          {totalWeeks > 1 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentWeek <= 1}
                onClick={() => handleWeekNavigation("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs uppercase tracking-[0.18em] text-evm-muted min-w-[80px] text-center">
                {currentWeek} / {totalWeeks}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentWeek >= totalWeeks}
                onClick={() => handleWeekNavigation("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {storyline && (
          <ConsoleFrame className="p-6">
            <TeletypeText
              text={storyline}
              className="text-sm leading-relaxed text-foreground"
            />
          </ConsoleFrame>
        )}
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
        <div className="grid gap-6">
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
              Задачи недели ещё не опубликованы.
            </ConsoleFrame>
          )}
        </div>
      )}
    </div>
  );
}

