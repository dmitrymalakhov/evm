"use client";

import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLevelStore } from "@/store/use-level-store";
import type { Task } from "@/types/contracts";
import { cn } from "@/lib/utils";

type TaskCardProps = {
  task: Task;
  index: number;
  onSubmit: () => Promise<void>;
};

export function TaskCard({ task, index, onSubmit }: TaskCardProps) {
  const submissions = useLevelStore((state) => state.submissions);
  const submission = submissions[task.id];
  const isCompleted = submission?.status === "accepted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={cn(
          "border-evm-steel/40 bg-black/40",
          isCompleted && "border-evm-matrix/50 shadow-[0_0_18px_rgba(8,200,112,0.3)]",
        )}
      >
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge>{task.type}</Badge>
            <CardTitle className="mt-2 text-lg uppercase tracking-[0.22em]">
              {task.title}
            </CardTitle>
          </div>
          <span className="text-sm uppercase tracking-[0.16em] text-evm-muted">
            {task.points} очков
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">
            {task.description}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {submission?.hint ? (
              <span className="text-xs uppercase tracking-[0.18em] text-evm-matrix">
                {submission.hint}
              </span>
            ) : (
              <span className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                Тип задачи: {task.type.toUpperCase()}
              </span>
            )}
            <Button onClick={onSubmit} variant={isCompleted ? "secondary" : "default"} disabled={isCompleted}>
              {isCompleted ? "Ключ сохранён" : "Сдать решение"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

