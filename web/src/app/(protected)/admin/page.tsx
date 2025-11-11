"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConsoleFrame } from "@/components/ui/console-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsPanel } from "@/components/admin/metrics-panel";
import { api } from "@/services/api";
import type { AdminMetrics, Level } from "@/types/contracts";

export default function AdminPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [levelsResponse, metricsResponse] = await Promise.all([
          api.getAdminLevels(),
          api.getAdminMetrics(),
        ]);
        setLevels(levelsResponse);
        setMetrics(metricsResponse);
      } catch (error) {
        toast.error("Не удалось загрузить панель администратора", {
          description:
            error instanceof Error ? error.message : "Сбой матрицы E.V.M.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  if (isLoading) {
    return (
      <ConsoleFrame className="flex h-[420px] items-center justify-center text-xs uppercase tracking-[0.24em] text-evm-muted">
        Загрузка панели администратора...
      </ConsoleFrame>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-evm-muted">
          Панель администратора
        </p>
        <h2 className="text-3xl font-semibold uppercase tracking-[0.28em]">
          Контроль уровней и активности
        </h2>
      </div>
      <ConsoleFrame className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Уровни</CardTitle>
              <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
                Управление контентом уровней и сроками
              </p>
            </div>
            <Button
              onClick={() =>
                toast.info("Mock", {
                  description: "CRUD для уровней подключён к мокам.",
                })
              }
            >
              Создать уровень (mock)
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {levels.map((level) => (
              <div
                key={level.id}
                className="grid gap-3 rounded-md border border-evm-steel/40 bg-black/40 p-4 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                    Неделя {level.week}: {level.title}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                    Состояние: {level.state} • Открывается{" "}
                    {new Date(level.opensAt).toLocaleString("ru-RU")}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="secondary">
                    Редактировать
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      toast.info("Mock", {
                        description: "Модерация связана с моками.",
                      })
                    }
                  >
                    Модерировать
                  </Button>
                </div>
              </div>
            ))}
            {levels.length === 0 ? (
              <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                Уровни не найдены. Добавьте первый.
              </p>
            ) : null}
          </CardContent>
        </Card>
        {metrics ? <MetricsPanel metrics={metrics} /> : null}
      </ConsoleFrame>
    </div>
  );
}

