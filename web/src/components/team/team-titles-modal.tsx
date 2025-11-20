"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { ConsoleFrame } from "@/components/ui/console-frame";
import {
  getAllTeamTitles,
  getTeamTitle,
  getNextTeamTitle,
} from "@/lib/utils";

type TeamTitlesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPoints: number;
};

export function TeamTitlesModal({
  isOpen,
  onClose,
  currentPoints,
}: TeamTitlesModalProps) {
  const allTitles = getAllTeamTitles();
  const currentTitle = getTeamTitle(currentPoints);
  const nextTitle = getNextTeamTitle(currentPoints);

  const progressToNext = useMemo(() => {
    if (!nextTitle) return null;
    const currentMin = currentTitle.minPoints;
    const nextMin = nextTitle.minPoints;
    const progress = ((currentPoints - currentMin) / (nextMin - currentMin)) * 100;
    return Math.max(0, Math.min(100, progress));
  }, [currentPoints, currentTitle, nextTitle]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4"
        >
          <ConsoleFrame className="space-y-6">
            <div className="flex items-center justify-between border-b border-evm-steel/20 pb-4">
              <div>
                <h2 className="text-xl font-semibold uppercase tracking-[0.28em]">
                  Система титулов
                </h2>
                <p className="text-xs uppercase tracking-[0.18em] text-evm-muted mt-1">
                  Прогрессия командных достижений
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Закрыть
              </Button>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border border-evm-steel/40 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-evm-muted mb-2">
                  Текущий статус
                </p>
                <p className="text-lg font-semibold uppercase tracking-[0.24em] text-foreground">
                  {currentTitle.title}
                </p>
                <p className="text-sm uppercase tracking-[0.18em] text-evm-muted mt-1">
                  {currentTitle.description}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-evm-muted mt-2">
                  Баллы: {currentPoints}
                </p>
                {nextTitle && progressToNext !== null && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-evm-muted">
                      <span>До следующего титула:</span>
                      <span>
                        {nextTitle.minPoints - currentPoints} баллов
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/50 border border-evm-steel/20">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressToNext}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-evm-accent to-evm-matrix"
                      />
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                      Следующий: {nextTitle.title}
                    </p>
                  </div>
                )}
                {!nextTitle && (
                  <p className="text-xs uppercase tracking-[0.18em] text-evm-muted mt-4">
                    Достигнут максимальный титул
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">
                  Все титулы
                </p>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {allTitles.map((title, index) => {
                    const isUnlocked = currentPoints >= title.minPoints;
                    const isCurrent = title.minPoints === currentTitle.minPoints;

                    return (
                      <motion.div
                        key={title.minPoints}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`rounded-md border p-3 ${
                          isCurrent
                            ? "border-evm-accent/60 bg-evm-accent/10"
                            : isUnlocked
                              ? "border-evm-matrix/40 bg-black/30"
                              : "border-evm-steel/20 bg-black/20 opacity-60"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className={`text-sm font-semibold uppercase tracking-[0.2em] ${
                                  isCurrent
                                    ? "text-evm-accent"
                                    : isUnlocked
                                      ? "text-foreground"
                                      : "text-evm-muted"
                                }`}
                              >
                                {title.title}
                              </p>
                              {isCurrent && (
                                <span className="text-xs uppercase tracking-[0.18em] text-evm-accent">
                                  [ТЕКУЩИЙ]
                                </span>
                              )}
                              {isUnlocked && !isCurrent && (
                                <span className="text-xs uppercase tracking-[0.18em] text-evm-matrix">
                                  [ДОСТИГНУТ]
                                </span>
                              )}
                            </div>
                            <p className="text-xs uppercase tracking-[0.18em] text-evm-muted mt-1">
                              {title.description}
                            </p>
                          </div>
                          <div className="ml-4 text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                              {title.minPoints}
                            </p>
                            <p className="text-xs uppercase tracking-[0.16em] text-evm-muted">
                              баллов
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ConsoleFrame>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

