"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gift, HeartHandshake, Shuffle, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConsoleFrame } from "@/components/ui/console-frame";
import { Textarea } from "@/components/ui/textarea";
import { Timer } from "@/components/timer";
import { cn } from "@/lib/utils";
import { ApiError, api } from "@/services/api";
import { useSessionStore } from "@/store/use-session-store";
import type {
  SecretSantaParticipant,
  SecretSantaParticipantStatus,
  SecretSantaState,
} from "@/types/contracts";

const STATUS_META: Record<
  SecretSantaParticipantStatus,
  { label: string; badge: "outline" | "warning" | "success" }
> = {
  waiting: {
    label: "В ожидании жеребьевки",
    badge: "outline",
  },
  matched: {
    label: "Дарит подарок",
    badge: "warning",
  },
  gifted: {
    label: "Подарок отправлен",
    badge: "success",
  },
};

const EVENT_DATE = new Date("2025-12-18T00:00:00");

const SECRET_SANTA_PHASES = [
  {
    title: "Регистрация",
    description: "Соберите пожелания и подтвердите участие до 15 декабря.",
    status: "active" as const,
  },
  {
    title: "Жеребьевка",
    description: "Система анонимно выдаёт вам получателя подарка.",
    status: "upcoming" as const,
  },
  {
    title: "Обмен",
    description: "Принесите подарок на оффлайн-встречу E.V.M. 18 декабря.",
    status: "upcoming" as const,
  },
];

export default function SecretSantaPage() {
  const { user } = useSessionStore();
  const [santaState, setSantaState] = useState<SecretSantaState | null>(null);
  const [wishlistDraft, setWishlistDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingAll, setIsDrawingAll] = useState(false);
  const isAdmin = user?.role === "admin";

  const participants = santaState?.participants ?? [];
  const currentParticipant = santaState?.me.participant ?? null;
  const matchedRecipient = santaState?.me.recipient ?? null;
  const matchId = matchedRecipient?.id ?? null;
  const isRegistered = Boolean(currentParticipant);

  const errorDescription = (error: unknown) =>
    error instanceof ApiError || error instanceof Error ? error.message : undefined;

  const loadSecretSanta = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getSecretSantaState();
      setSantaState(data);
    } catch (error) {
      toast.error("Не удалось загрузить Тайного Санту", {
        description: errorDescription(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSecretSanta();
  }, [loadSecretSanta]);

  useEffect(() => {
    if (!currentParticipant) {
      return;
    }
    setWishlistDraft(currentParticipant.wishlist);
  }, [currentParticipant]);

  const handleJoin = async () => {
    if (!user) {
      toast.error("Нужно авторизоваться, чтобы участвовать.");
      return;
    }
    if (!wishlistDraft.trim()) {
      toast.error("Заполните пожелания, чтобы команда знала, что вам подарить.");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await api.registerSecretSanta({
        wishlist: wishlistDraft.trim(),
      });
      setSantaState(data);
      toast.success("Вы в игре Тайного Санты!");
    } catch (error) {
      toast.error("Не удалось сохранить участие", {
        description: errorDescription(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDraw = async () => {
    if (!user) {
      toast.error("Нужно авторизоваться, чтобы вытянуть участника.");
      return;
    }
    if (!isRegistered) {
      toast.error("Сначала зарегистрируйтесь и заполните пожелания.");
      return;
    }
    if (matchId) {
      toast.info("Получатель уже выбран — проверьте карточку.");
      return;
    }

    try {
      setIsDrawing(true);
      const data = await api.drawSecretSanta();
      setSantaState(data);
      const recipient = data.me.recipient;
      toast.success("Имя вытянуто! Сохраняем интригу.", {
        description: recipient ? `Теперь вы готовите подарок для ${recipient.name}.` : undefined,
      });
    } catch (error) {
      toast.error("Не удалось провести жеребьевку", {
        description: errorDescription(error),
      });
    } finally {
      setIsDrawing(false);
    }
  };

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      if (a.status === b.status) {
        return a.name.localeCompare(b.name, "ru");
      }
      if (a.status === "gifted") return -1;
      if (b.status === "gifted") return 1;
      if (a.status === "matched") return -1;
      if (b.status === "matched") return 1;
      return 0;
    });
  }, [participants]);

  const handleDrawAll = async () => {
    const waitingCount = participants.filter((p) => p.status === "waiting").length;
    if (waitingCount < 2) {
      toast.error("Нужно минимум 2 участника для жеребьевки");
      return;
    }

    if (!confirm(`Запустить жеребьевку для всех ${waitingCount} участников? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      setIsDrawingAll(true);
      const data = await api.drawAllSecretSanta();
      setSantaState(data);
      toast.success("Жеребьевка завершена!", {
        description: `Все ${waitingCount} участников получили своих получателей.`,
      });
    } catch (error) {
      toast.error("Не удалось запустить жеребьевку", {
        description: errorDescription(error),
      });
    } finally {
      setIsDrawingAll(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">Совершенно секретно</p>
            <h1 className="text-3xl font-semibold uppercase tracking-[0.28em]">Тайный Санта</h1>
            <p className="text-sm uppercase tracking-[0.18em] text-evm-muted max-w-2xl">
              Включаем праздничный протокол. Поделитесь пожеланиями, вытяните коллегу и подготовьте
              анонимный подарок, чтобы поддержать командный дух программы ЁЛКА.
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={handleDrawAll}
              disabled={isDrawingAll || participants.filter((p) => p.status === "waiting").length < 2}
              className="shrink-0"
            >
              {isDrawingAll ? "Жеребьевка..." : "Запустить жеребьевку для всех"}
            </Button>
          )}
        </div>
      </div>

      <ConsoleFrame className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-evm-matrix" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
                Командный барометр
              </p>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">Статистика игры</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-semibold">{participants.length}</p>
              <p className="text-[0.65rem] uppercase tracking-[0.24em] text-evm-muted">
                Участников
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-evm-matrix">
                {participants.filter((participant) => participant.status !== "waiting").length}
              </p>
              <p className="text-[0.65rem] uppercase tracking-[0.24em] text-evm-muted">
                Уже вытянули
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-evm-accent">
                {participants.filter((participant) => participant.status === "gifted").length}
              </p>
              <p className="text-[0.65rem] uppercase tracking-[0.24em] text-evm-muted">
                Подарков в пути
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-evm-accent" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
                Как всё работает
              </p>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">
                Три шага к идеальному подарку
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3 mb-4">
            {SECRET_SANTA_PHASES.map((phase) => (
              <div
                key={phase.title}
                className={cn(
                  "rounded-lg border border-white/15 bg-white/5 p-3 text-sm transition-all space-y-1.5",
                  phase.status === "active" ? "border-evm-accent/60 bg-evm-accent/10" : "",
                )}
              >
                <p className="text-xs uppercase tracking-[0.28em] text-evm-muted">{phase.title}</p>
                <p className="text-xs leading-relaxed text-foreground/90">{phase.description}</p>
              </div>
            ))}
          </div>
          <div className="rounded-md border border-evm-accent/30 bg-evm-accent/5 p-3 space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
              До мероприятия
            </p>
            <Timer target={EVENT_DATE.toISOString()} label="18 декабря 2025" />
          </div>
        </div>
      </ConsoleFrame>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <ConsoleFrame className="space-y-6 p-6">
          <div className="flex items-center gap-3">
            <Shuffle className="h-5 w-5 text-evm-accent" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">Панель агента</p>
              <p className="text-base font-semibold uppercase tracking-[0.18em]">
                Твой ход, Тайный Санта
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-xs uppercase tracking-[0.24em] text-evm-muted">
              Твои пожелания
            </label>
            <Textarea
              placeholder="Расскажи о любимых цветах, вкусе и маленьких радостях."
              value={wishlistDraft}
              onChange={(event) => setWishlistDraft(event.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleJoin}>Участвовать</Button>
            <Button
              variant="outline"
              onClick={handleDraw}
              disabled={isDrawing || !isRegistered || Boolean(matchId)}
            >
              {isDrawing ? "Жеребьевка..." : "Вытянуть имя"}
            </Button>
          </div>
          {!isRegistered && (
            <p className="text-xs uppercase tracking-[0.2em] text-evm-muted pt-1">
              Прежде чем тянуть имя, заполните пожелания и подтвердите участие.
            </p>
          )}
        </ConsoleFrame>

        <ConsoleFrame className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <HeartHandshake className="h-5 w-5 text-evm-accent" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
                Карточка получателя
              </p>
              <p className="text-base font-semibold uppercase tracking-[0.18em]">
                Держите тайну в секрете
              </p>
            </div>
          </div>

          {matchedRecipient ? (
            <div className="rounded-lg border border-white/15 bg-white/5 p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.24em]">
                  {matchedRecipient.name}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                  {matchedRecipient.department}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">Пожелания</p>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {matchedRecipient.wishlist}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/20 bg-black/20 p-5 text-sm leading-relaxed text-evm-muted">
              Пока что мы никому о вас не рассказали. Как только вытянете имя, здесь появится
              карточка с пожеланиями получателя.
            </div>
          )}
        </ConsoleFrame>
      </div>

      <ConsoleFrame className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-evm-accent" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
              Список участников
            </p>
            <p className="text-base font-semibold uppercase tracking-[0.18em]">
              Наблюдаем прогресс команды
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {sortedParticipants.map((participant) => {
            const status = STATUS_META[participant.status];
            return (
              <div
                key={participant.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-white/12 bg-white/5 px-5 py-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em]">
                      {participant.name}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                      {participant.department}
                    </p>
                  </div>
                  <p className="text-[0.8rem] text-evm-muted/90 leading-relaxed">
                    Хочет: {participant.wishlist}
                  </p>
                </div>
                <Badge variant={status.badge} className="shrink-0">{status.label}</Badge>
              </div>
            );
          })}
        </div>
      </ConsoleFrame>
    </div>
  );
}

