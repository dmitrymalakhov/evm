"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";
import { Timer } from "@/components/timer";
import { KeySlots } from "@/components/key-slots";
import { BadgeList } from "@/components/badge-list";
import { ConsoleFrame } from "@/components/ui/console-frame";
import { useSessionStore } from "@/store/use-session-store";
import { useLevelStore } from "@/store/use-level-store";
import { useTeamStore } from "@/store/use-team-store";
import { TeletypeText } from "@/components/ui/teletype-text";

export default function DashboardPage() {
  const { user } = useSessionStore();
  const { currentLevel, loadLevel, unlockedKeys } = useLevelStore();
  const { hydrate, team, progress } = useTeamStore();

  useEffect(() => {
    if (user?.teamId) {
      void hydrate(user.teamId);
      void loadLevel({ teamId: user.teamId });
    } else {
      void loadLevel();
    }
  }, [user?.teamId, hydrate, loadLevel]);

  const badges = useMemo(
    () =>
      [
        {
          id: "badge-1",
          title: "ИНЖЕНЕР 2 РАЗРЯДА",
          description: "Завершил 3 этап реконфигурации",
        },
        {
          id: "badge-2",
          title: "КУРАТОР ЭМО-КОНТУРА",
          description: "Поддержал 5 командных артефактов",
        },
      ] as const,
    [],
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
          Личный кабинет оператора
        </p>
        <h2 className="text-3xl font-semibold uppercase tracking-[0.28em]">
          Добро пожаловать, {user?.name ?? "оператор"}.
        </h2>
      </div>

      <ConsoleFrame className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <div className="space-y-3">
            <motion.h3
              className="text-xl uppercase tracking-[0.28em] text-evm-accent"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Текущая неделя: {currentLevel?.title ?? "Загрузка..."}
            </motion.h3>
            <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
              Итерация:{" "}
              {currentLevel?.iteration
                ? `${currentLevel.iteration.name} • Неделя ${currentLevel.iteration.currentWeek}/${currentLevel.iteration.totalWeeks}`
                : "синхронизация"}
            </p>
            <TeletypeText
              text={
                currentLevel?.config?.storyline ??
                "Матрица собирает сведения о текущем цикле."
              }
              speed={18}
            />
          </div>

          <Timer
            target={currentLevel?.closesAt ?? new Date(Date.now() + 86_400_000)}
            label="До закрытия фазы"
          />
          <KeySlots collected={unlockedKeys} />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Команда</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-evm-muted">
                {team
                  ? `${team.name} • ${team.slogan}`
                  : "Загрузка сведений о команде..."}
              </p>

              <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                Баллы команды: {progress?.totalPoints ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Мои титулы</CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeList badges={badges.slice(0, 2)} />
            </CardContent>
          </Card>
        </div>
      </ConsoleFrame>
    </div>
  );
}

