"use client";

import { useEffect } from "react";

import { ChatPanel } from "@/components/team/chat-panel";
import { IdeasBoard } from "@/components/team/ideas-board";
import { useSessionStore } from "@/store/use-session-store";
import { useTeamStore } from "@/store/use-team-store";
import { ProgressBar } from "@/components/progress-bar";
import { ConsoleFrame } from "@/components/ui/console-frame";

export default function TeamPage() {
  const { user } = useSessionStore();
  const { hydrate, team, progress } = useTeamStore();

  useEffect(() => {
    if (user?.teamId) {
      void hydrate(user.teamId);
    }
  }, [user?.teamId, hydrate]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
          Командный хаб
        </p>
        <h2 className="text-3xl font-semibold uppercase tracking-[0.28em]">
          {team ? `${team.name}` : "Загрузка команды"}
        </h2>
        <p className="text-sm uppercase tracking-[0.18em] text-evm-muted">
          {team?.slogan ?? "Слоган загрузится после синхронизации"}
        </p>
      </div>
      <ConsoleFrame className="space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
          Командные баллы: {progress?.totalPoints ?? 0}
        </p>
      </ConsoleFrame>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ChatPanel />
        <IdeasBoard />
      </div>
    </div>
  );
}

