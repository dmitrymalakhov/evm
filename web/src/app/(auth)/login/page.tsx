"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";

import { ConsoleFrame } from "@/components/ui/console-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSessionStore } from "@/store/use-session-store";
import { TeletypeText } from "@/components/ui/teletype-text";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { hasSeenOnboarding } from "@/lib/onboarding";

const formSchema = z.object({
  tabNumber: z
    .string()
    .min(4, "Укажите табельный номер")
    .regex(/^[0-9A-Z-]+$/, "Допустимы символы 0-9, A-Z, тире"),
  otp: z
    .string()
    .min(4, "Код доступа обязателен")
    .regex(/^[0-9]+$/, "Только цифры"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isLoading, error } = useSessionStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tabNumber: "",
      otp: "",
    },
  });

  useEffect(() => {
    if (user) {
      router.replace("/levels");
    }
  }, [user, router]);

  useEffect(() => {
    // Проверяем, видел ли пользователь онбординг
    const hasSeen = hasSeenOnboarding();
    setShowOnboarding(!hasSeen);
    setHasCheckedOnboarding(true);
  }, []);

  useEffect(() => {
    if (error) {
      toast.error("Сбой проверки оператора", {
        description: error,
      });
    }
  }, [error]);

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values.tabNumber, values.otp);
      toast.success("Матрица открыта", {
        description: "Вы перенаправлены в личный кабинет E.V.M.",
      });
      track(ANALYTICS_EVENTS.loginSuccess, { tabNumber: values.tabNumber });
      router.push("/levels");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Неизвестная ошибка входа";
      toast.error("Матрица отклонила вход", {
        description: message,
      });
    }
  };

  // Показываем онбординг, если пользователь его еще не видел
  if (!hasCheckedOnboarding) {
    return null; // Пока проверяем
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-10">
      <div className="space-y-4 text-center">
        <motion.span
          className="text-xs uppercase tracking-[0.38em] text-evm-muted"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ПРОТОКОЛ ДОСТУПА
        </motion.span>
        <motion.h1
          className="text-glitch text-3xl font-semibold uppercase tracking-[0.3em]"
          data-text="ВХОД В ЦИФРОВУЮ СЕТЬ"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ВХОД В ЦИФРОВУЮ СЕТЬ
        </motion.h1>
      </div>

      <ConsoleFrame glow="matrix" className="w-full space-y-8">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
            Журнал связи • КАНАЛ ЁЛКА
          </p>
          <TeletypeText
            text="Введите табельный номер оператора и одноразовый код, чтобы инициировать контур E.V.M."
            speed={18}
          />
        </div>
        <Separator />
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 text-left"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tabNumber">Табельный номер</Label>
              <Input
                id="tabNumber"
                placeholder="OP-17-03"
                {...form.register("tabNumber")}
              />
              {form.formState.errors.tabNumber ? (
                <p className="text-xs uppercase tracking-[0.16em] text-evm-accent">
                  {form.formState.errors.tabNumber.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="otp">OTP код</Label>
              <Input
                id="otp"
                type="password"
                placeholder="••••"
                maxLength={6}
                {...form.register("otp")}
              />
              {form.formState.errors.otp ? (
                <p className="text-xs uppercase tracking-[0.16em] text-evm-accent">
                  {form.formState.errors.otp.message}
                </p>
              ) : null}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Проверка доступа..." : "Войти в систему"}
          </Button>
        </form>
      </ConsoleFrame>
      <p className="text-center text-xs uppercase tracking-[0.24em] text-evm-muted">
        Проект ЁЛКА, 1977 → 2077. Несанкционированный доступ преследуется.
      </p>
    </div>
  );
}

