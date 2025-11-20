"use client";

import { useEffect, useMemo, useState } from "react";

import { ChatPanel } from "@/components/team/chat-panel";
import { IdeasBoard } from "@/components/team/ideas-board";
import { TeamTitlesModal } from "@/components/team/team-titles-modal";
import { useSessionStore } from "@/store/use-session-store";
import { useTeamStore } from "@/store/use-team-store";
import { ProgressBar } from "@/components/progress-bar";
import { ConsoleFrame } from "@/components/ui/console-frame";
import { Button } from "@/components/ui/button";
import { getTeamTitle } from "@/lib/utils";

export default function TeamPage() {
  const { user } = useSessionStore();
  const { hydrate, team, progress, refreshProgress } = useTeamStore();
  const [isTitlesModalOpen, setIsTitlesModalOpen] = useState(false);

  const teamTitle = useMemo(() => {
    const points = progress?.totalPoints ?? 0;
    return getTeamTitle(points);
  }, [progress?.totalPoints]);

  useEffect(() => {
    if (user?.teamId) {
      void hydrate(user.teamId);
    }
  }, [user?.teamId, hydrate]);

  // Автоматически обновляем прогресс команды каждые 5 секунд
  useEffect(() => {
    if (!user?.teamId) return;

    const interval = setInterval(() => {
      void refreshProgress();
    }, 5000); // Обновляем каждые 5 секунд

    return () => clearInterval(interval);
  }, [user?.teamId, refreshProgress]);

  // Обновляем прогресс при возвращении на страницу
  useEffect(() => {
    if (!user?.teamId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshProgress();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.teamId, refreshProgress]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
          Командный хаб
        </p>
        <h2 className="text-3xl font-semibold uppercase tracking-[0.28em]">
          {team ? `${team.name}` : "Загрузка команды"}
        </h2>
        <div className="rounded-md border border-evm-steel/40 bg-black/30 p-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">
                {teamTitle.title}
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-evm-muted mt-1">
                {teamTitle.description}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTitlesModalOpen(true)}
              className="shrink-0"
            >
              Все титулы
            </Button>
          </div>
        </div>
        <p className="text-sm uppercase tracking-[0.18em] text-evm-muted">
          {team?.slogan ?? "Слоган загрузится после синхронизации"}
        </p>
      </div>
      <ConsoleFrame className="space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
          Командные баллы: {progress?.totalPoints ?? 0}
        </p>
      </ConsoleFrame>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ChatPanel />
        <IdeasBoard />
      </div>
      <TeamTitlesModal
        isOpen={isTitlesModalOpen}
        onClose={() => setIsTitlesModalOpen(false)}
        currentPoints={progress?.totalPoints ?? 0}
      />
    </div>
  );
}

