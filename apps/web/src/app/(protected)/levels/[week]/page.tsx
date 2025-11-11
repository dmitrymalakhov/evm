"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { TaskCard } from "@/components/level/task-card";
import { useLevelStore } from "@/store/use-level-store";
import { useSessionStore } from "@/store/use-session-store";
import { useTeamStore } from "@/store/use-team-store";
import { ProgressBar } from "@/components/progress-bar";
import { ConsoleFrame } from "@/components/ui/console-frame";
import { TeletypeText } from "@/components/ui/teletype-text";

export default function LevelWeekPage() {
  const params = useParams<{ week: string }>();
  const weekNumber = useMemo(
    () => Number(params?.week ?? 0),
    [params?.week],
  );
  const { user } = useSessionStore();
  const { currentLevel, tasks, loadLevel, submitTask } = useLevelStore();
  const { progress } = useTeamStore();

  useEffect(() => {
    if (Number.isNaN(weekNumber) || weekNumber <= 0) {
      void loadLevel({ teamId: user?.teamId });
      return;
    }
    void loadLevel({ week: weekNumber, teamId: user?.teamId });
  }, [weekNumber, user?.teamId, loadLevel]);

  async function handleSubmit(taskId: string) {
    try {
      const response = await submitTask(taskId, {
        payload: "demo",
      });
      toast.success("Сабмит принят", {
        description: response.hint ?? "Фрагмент зафиксирован.",
      });
    } catch (error) {
      toast.error("Сабмит отклонён", {
        description:
          error instanceof Error ? error.message : "Неизвестная ошибка матрицы",
      });
    }
  }

  const storyline =
    currentLevel?.config?.storyline ??
    "Матрица подготавливает данные о текущем уровне.";

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
          Уровень {weekNumber || currentLevel?.week}
        </p>
        <h2 className="text-3xl font-semibold uppercase tracking-[0.28em]">
          {currentLevel?.title ?? "Подготовка уровня..."}
        </h2>
      </div>

      <ConsoleFrame className="space-y-6">
        <TeletypeText text={storyline} speed={16} />
        <ProgressBar
          value={progress?.progress ?? 52}
          label="Командный прогресс"
        />
      </ConsoleFrame>

      <div className="grid gap-6">
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            onSubmit={() => handleSubmit(task.id)}
          />
        ))}
        {tasks.length === 0 ? (
          <ConsoleFrame className="text-sm uppercase tracking-[0.2em] text-evm-muted">
            Задачи недели ещё не опубликованы.
          </ConsoleFrame>
        ) : null}
      </div>
    </div>
  );
}

