"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTeamStore } from "@/store/use-team-store";
import { useSessionStore } from "@/store/use-session-store";
import { formatRelative } from "@/lib/utils";

export function IdeasBoard() {
  const { ideas, createIdea, hydrate, voteIdea, teamId } = useTeamStore();
  const { user } = useSessionStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

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

  async function handleVote(id: string) {
    setProcessingId(id);
    try {
      const updated = await voteIdea(id);
      toast.success(updated.userHasVoted ? "Голос учтён" : "Голос отменён", {
        description: updated.userHasVoted
          ? "Спасибо за участие в голосовании."
          : "Вы можете проголосовать за идею снова.",
      });
    } catch (error) {
      toast.error("Голос не принят", {
        description:
          error instanceof Error ? error.message : "Сбой канала голосования",
      });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="rounded-md border border-evm-steel/40 bg-black/40">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left transition-colors hover:bg-black/20"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em]">
              Доска идей
            </h3>
            <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
              {isExpanded
                ? "Дополняйте инициативы и голосуйте"
                : `${ideas.length} ${ideas.length === 1 ? "идея" : ideas.length < 5 ? "идеи" : "идей"}`}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-evm-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-evm-muted" />
          )}
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-evm-steel/40 p-4">
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
              <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
                {ideas.length === 0 ? (
                  <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                    Нет активных идей. Добавьте первую инициативу.
                  </p>
                ) : (
                  ideas.map((idea) => (
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
                          onClick={() => handleVote(idea.id)}
                          disabled={processingId === idea.id}
                        >
                          {idea.userHasVoted ? "Отменить голос" : "Голосовать"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

