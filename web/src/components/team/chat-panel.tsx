"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTeamStore } from "@/store/use-team-store";
import { useSessionStore } from "@/store/use-session-store";
import { formatRelative } from "@/lib/utils";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import { toast } from "sonner";

const MAX_DISPLAYED_MESSAGES = 100;
const ANIMATION_THRESHOLD = 20; // Анимируем только последние 20 сообщений

export function ChatPanel() {
  const { chat, sendMessage, teamId, hydrate } = useTeamStore();
  const { user } = useSessionStore();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (user?.teamId && !teamId) {
      void hydrate(user.teamId);
    }
  }, [user?.teamId, teamId, hydrate]);

  // Ограничиваем количество отображаемых сообщений (показываем последние N)
  const displayedChat = useMemo(() => {
    if (chat.length <= MAX_DISPLAYED_MESSAGES) {
      return chat;
    }
    return chat.slice(-MAX_DISPLAYED_MESSAGES);
  }, [chat]);

  const hiddenMessagesCount = chat.length - displayedChat.length;

  // Автоматическая прокрутка к новым сообщениям
  useEffect(() => {
    if (!chatContainerRef.current || !shouldAutoScrollRef.current) return;

    const container = chatContainerRef.current;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    // Прокручиваем только если пользователь уже был внизу или это новое сообщение
    if (isNearBottom || chat.length === 0) {
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop =
            chatContainerRef.current.scrollHeight;
        }
      });
    }
  }, [chat.length]);

  // Отслеживаем новые сообщения для анимации
  useEffect(() => {
    if (chat.length > 0) {
      const lastMessage = chat[chat.length - 1];
      if (lastMessage.id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = lastMessage.id;
        shouldAutoScrollRef.current = true;
      }
    }
  }, [chat]);

  // Обработка скролла для определения, нужно ли автоскроллить
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const container = chatContainerRef.current;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;
    shouldAutoScrollRef.current = isNearBottom;
  };

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setIsSending(true);
    try {
      await sendMessage(message.trim());
      track(ANALYTICS_EVENTS.levelSubmit, { channel: "team-chat" });
      setMessage("");
      shouldAutoScrollRef.current = true;
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
          Сообщения сохраняются в базе данных команды
          {hiddenMessagesCount > 0 && (
            <span className="ml-2">
              (показано {displayedChat.length} из {chat.length})
            </span>
          )}
        </p>
      </div>
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="h-[65vh] space-y-3 overflow-y-auto overscroll-contain pr-2 scroll-smooth"
        style={{ overscrollBehaviorY: 'contain' }}
      >
        {hiddenMessagesCount > 0 && (
          <div className="rounded-md border border-evm-steel/40 bg-black/20 p-2 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
              Пропущено {hiddenMessagesCount} более ранних сообщений
            </p>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {displayedChat.map((entry, index) => {
            const isRecent =
              displayedChat.length - index <= ANIMATION_THRESHOLD;
            const shouldAnimate = isRecent && index === displayedChat.length - 1;

            const messageContent = (
              <div
                key={entry.id}
                className="rounded-md border border-evm-steel/40 bg-black/30 p-3"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-evm-muted">
                  <span>{entry.userName}</span>
                  <span>{formatRelative(entry.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">{entry.body}</p>
              </div>
            );

            if (shouldAnimate) {
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {messageContent}
                </motion.div>
              );
            }

            return messageContent;
          })}
        </AnimatePresence>
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

