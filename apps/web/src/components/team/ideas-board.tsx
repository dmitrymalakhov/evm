"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTeamStore } from "@/store/use-team-store";
import { useSessionStore } from "@/store/use-session-store";
import { formatRelative } from "@/lib/utils";

export function IdeasBoard() {
  const { ideas, createIdea, hydrate, updateIdea, teamId } = useTeamStore();
  const { user } = useSessionStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.teamId && !teamId) {
      void hydrate(user.teamId);
    }
  }, [user?.teamId, hydrate, teamId]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setIsSubmitting(true);
    try {
      await createIdea(title.trim(), description.trim());
      toast.success("Идея добавлена", {
        description: "Командная доска обновлена.",
      });
      setTitle("");
      setDescription("");
    } catch (error) {
      toast.error("Не удалось создать идею", {
        description:
          error instanceof Error ? error.message : "Сбой связи с Матрицей",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVote(id: string, currentVotes: number) {
    try {
      await updateIdea(id, { votes: currentVotes + 1 });
    } catch (error) {
      toast.error("Голос не принят", {
        description:
          error instanceof Error ? error.message : "Сбой канала голосования",
      });
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-evm-steel/40 bg-black/40 p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em]">
          Доска идей
        </h3>
        <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
          Дополняйте инициативы и голосуйте
        </p>
      </div>
      <form onSubmit={handleCreate} className="space-y-3">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Название инициативы"
        />
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Описание идеи"
          className="min-h-[100px]"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim()}
          >
            {isSubmitting ? "Сохранение..." : "Добавить идею"}
          </Button>
        </div>
      </form>
      <div className="space-y-3">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="rounded-md border border-evm-steel/40 bg-black/30 p-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em]">
                {idea.title}
              </h4>
              <span className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                {formatRelative(idea.createdAt)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {idea.description}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-evm-muted">
              <span>Голоса: {idea.votes}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleVote(idea.id, idea.votes)}
              >
                Голосовать
              </Button>
            </div>
          </div>
        ))}
        {ideas.length === 0 ? (
          <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
            Нет активных идей. Добавьте первую инициативу.
          </p>
        ) : null}
      </div>
    </div>
  );
}

