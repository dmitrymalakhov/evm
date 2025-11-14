"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskSubmissionForm } from "@/components/level/task-submission-form";
import { useLevelStore } from "@/store/use-level-store";
import type { Task } from "@/types/contracts";
import { cn } from "@/lib/utils";

type TaskCardProps = {
  task: Task;
  index: number;
  onSubmit: (payload: {
    photos?: string[];
    survey?: Record<string, string>;
    text?: string;
  }) => Promise<void>;
  onUploadFiles?: (files: File[]) => Promise<Array<{ filename: string; url: string; originalName: string; size: number; mimetype: string }>>;
};

export function TaskCard({ task, index, onSubmit, onUploadFiles }: TaskCardProps) {
  const submissions = useLevelStore((state) => state.submissions);
  const submission = submissions[task.id];
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCompleted = submission?.status === "accepted";
  const isPending = submission?.status === "pending";
  const isRejected = submission?.status === "rejected";
  const isRevision = submission?.status === "revision";

  const handleSubmit = async (payload: {
    photos?: string[];
    survey?: Record<string, string>;
    text?: string;
  }) => {
    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      setShowForm(false);
    } catch (error) {
      // Error is already handled by the form or parent component
      console.error("Failed to submit task:", error);
      // Don't close form on error so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

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
          isPending && "border-evm-accent/50 shadow-[0_0_18px_rgba(255,193,7,0.2)]",
          isRevision && "border-orange-500/50 shadow-[0_0_18px_rgba(249,115,22,0.2)]",
          isRejected && "border-red-500/50 shadow-[0_0_18px_rgba(239,68,68,0.2)]",
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

          {showForm ? (
            <TaskSubmissionForm
              task={task}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              isSubmitting={isSubmitting}
              onUploadFiles={onUploadFiles}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                {isCompleted && (
                  <span className="text-xs uppercase tracking-[0.18em] text-evm-matrix">
                    ✓ Задание принято
                  </span>
                )}
                {isPending && (
                  <span className="text-xs uppercase tracking-[0.18em] text-evm-accent">
                    ⏳ На модерации
                  </span>
                )}
                {isRevision && (
                  <span className="text-xs uppercase tracking-[0.18em] text-orange-500">
                    🔄 На доработке
                  </span>
                )}
                {isRejected && (
                  <span className="text-xs uppercase tracking-[0.18em] text-red-500">
                    ✗ Отклонено
                  </span>
                )}
                {submission?.hint && (
                  <span className="text-xs uppercase tracking-[0.18em] text-evm-matrix">
                    {submission.hint}
                  </span>
                )}
                {submission?.message && (
                  <span className="text-xs text-evm-muted">
                    {submission.message}
                  </span>
                )}
                {!submission && (
                  <span className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                    Тип задачи: {task.type.toUpperCase()}
                  </span>
                )}
              </div>
              <Button
                onClick={() => setShowForm(true)}
                variant={isCompleted ? "secondary" : "default"}
                disabled={isCompleted || (isPending && !isRevision)}
              >
                {isCompleted
                  ? "Ключ сохранён"
                  : isPending && !isRevision
                    ? "На модерации"
                    : isRevision
                      ? "Доработать"
                      : isRejected
                        ? "Отправить снова"
                        : "Сдать на модерацию"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

