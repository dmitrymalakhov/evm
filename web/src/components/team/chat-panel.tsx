"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTeamStore } from "@/store/use-team-store";
import { useSessionStore } from "@/store/use-session-store";
import { formatRelative } from "@/lib/utils";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import { toast } from "sonner";

export function ChatPanel() {
  const { chat, sendMessage, teamId, hydrate } = useTeamStore();
  const { user } = useSessionStore();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (user?.teamId && !teamId) {
      void hydrate(user.teamId);
    }
  }, [user?.teamId, teamId, hydrate]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setIsSending(true);
    try {
      await sendMessage(message.trim());
      track(ANALYTICS_EVENTS.levelSubmit, { channel: "team-chat" });
      setMessage("");
    } catch (error) {
      toast.error("Сообщение не отправлено", {
        description:
          error instanceof Error ? error.message : "Сбой канала связи",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-evm-steel/40 bg-black/40 p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em]">
          Мини-чат команды
        </h3>
        <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
          Сообщения синхронизируются через моковый канал
        </p>
      </div>
      <div className="max-h-72 space-y-3 overflow-y-auto pr-2">
        {chat.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="rounded-md border border-evm-steel/40 bg-black/30 p-3"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-evm-muted">
              <span>{entry.userName}</span>
              <span>{formatRelative(entry.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{entry.body}</p>
          </motion.div>
        ))}
        {chat.length === 0 ? (
          <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
            Сообщений пока нет. Попробуйте инициировать разговор.
          </p>
        ) : null}
      </div>
      <form onSubmit={handleSend} className="space-y-3">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Введите сообщение для команды..."
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSending || message.trim().length < 2}>
            {isSending ? "Отправка..." : "Отправить"}
          </Button>
        </div>
      </form>
    </div>
  );
}

