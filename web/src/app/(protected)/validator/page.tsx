"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConsoleFrame } from "@/components/ui/console-frame";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { track, ANALYTICS_EVENTS } from "@/lib/analytics";

export default function ValidatorPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{
    status: "idle" | "valid" | "invalid";
    message?: string;
  }>({ status: "idle" });
  const [isChecking, setIsChecking] = useState(false);

  async function handleValidate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) return;
    setIsChecking(true);
    try {
      const response = await api.validatePass(code);
      setResult({ status: response.status, message: response.message });
      track(ANALYTICS_EVENTS.validatorCheck, {
        status: response.status,
      });
      toast[response.status === "valid" ? "success" : "error"](
        response.status === "valid"
          ? "Пропуск действителен"
          : "Пропуск недействителен",
        {
          description: response.message,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось проверить код";
      toast.error("Сервис проверки недоступен", {
        description: message,
      });
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
          Валидатор пропусков
        </p>
        <h2 className="text-3xl font-semibold uppercase tracking-[0.28em]">
          Проверка входного QR
        </h2>
      </div>
      <ConsoleFrame className="space-y-6">
        <form onSubmit={handleValidate} className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
            Введите код или отсканированный QR для проверки
          </p>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="EVM-QR-XXXX-XXXX"
          />
          <Button type="submit" disabled={isChecking || code.trim().length < 6}>
            {isChecking ? "Проверка..." : "Проверить"}
          </Button>
        </form>
        {result.status !== "idle" ? (
          <div
            className="rounded-md border border-evm-steel/40 bg-black/40 p-4 text-sm uppercase tracking-[0.2em]"
            data-status={result.status}
          >
            <p
              className={
                result.status === "valid"
                  ? "text-evm-matrix"
                  : "text-evm-accent"
              }
            >
              {result.message}
            </p>
          </div>
        ) : null}
      </ConsoleFrame>
    </div>
  );
}

