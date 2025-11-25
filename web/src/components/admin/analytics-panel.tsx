"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";
import type {
  TaskCompletionStat,
  UserProgressStat,
  WeeklyActivityStat,
  TopUserStat,
  TaskCompletionByWeek,
} from "@/types/contracts";

export function AnalyticsPanel() {
  const [taskStats, setTaskStats] = useState<TaskCompletionStat[]>([]);
  const [userStats, setUserStats] = useState<UserProgressStat[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivityStat[]>([]);
  const [topUsers, setTopUsers] = useState<TopUserStat[]>([]);
  const [taskByWeek, setTaskByWeek] = useState<TaskCompletionByWeek[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "tasks" | "activity">("overview");

  useEffect(() => {
    async function load() {
      try {
        const [taskStatsData, userStatsData, weeklyActivityData, topUsersData, taskByWeekData] =
          await Promise.all([
            api.getTaskCompletionStats(),
            api.getUserProgressStats(),
            api.getWeeklyActivityStats(),
            api.getTopUsersByActivity(10),
            api.getTaskCompletionByWeek(),
          ]);
        setTaskStats(taskStatsData);
        setUserStats(userStatsData);
        setWeeklyActivity(weeklyActivityData);
        setTopUsers(topUsersData);
        setTaskByWeek(taskByWeekData);
      } catch (error) {
        toast.error("Не удалось загрузить аналитику", {
          description:
            error instanceof Error ? error.message : "Ошибка загрузки данных",
        });
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Аналитика</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
            Загрузка данных...
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalTasksCompleted = taskStats.reduce((sum, stat) => sum + stat.completedCount, 0);
  const totalUsers = userStats.length;
  const activeUsers = userStats.filter((u) => u.totalActions > 0).length;
  const totalActions = userStats.reduce((sum, u) => sum + u.totalActions, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Аналитика действий пользователей</CardTitle>
        <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
          Статистика выполнения заданий и активности пользователей
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-evm-steel/20">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-xs uppercase tracking-[0.18em] ${
              activeTab === "overview"
                ? "border-b-2 border-evm-accent text-evm-accent"
                : "text-evm-muted hover:text-foreground"
            }`}
          >
            Обзор
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 text-xs uppercase tracking-[0.18em] ${
              activeTab === "users"
                ? "border-b-2 border-evm-accent text-evm-accent"
                : "text-evm-muted hover:text-foreground"
            }`}
          >
            Пользователи
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-4 py-2 text-xs uppercase tracking-[0.18em] ${
              activeTab === "tasks"
                ? "border-b-2 border-evm-accent text-evm-accent"
                : "text-evm-muted hover:text-foreground"
            }`}
          >
            Задания
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2 text-xs uppercase tracking-[0.18em] ${
              activeTab === "activity"
                ? "border-b-2 border-evm-accent text-evm-accent"
                : "text-evm-muted hover:text-foreground"
            }`}
          >
            Активность
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-evm-steel/40 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                  Всего пользователей
                </p>
                <p className="mt-2 text-2xl font-semibold">{totalUsers}</p>
              </div>
              <div className="rounded-md border border-evm-steel/40 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                  Активных пользователей
                </p>
                <p className="mt-2 text-2xl font-semibold">{activeUsers}</p>
              </div>
              <div className="rounded-md border border-evm-steel/40 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                  Выполнено заданий
                </p>
                <p className="mt-2 text-2xl font-semibold">{totalTasksCompleted}</p>
              </div>
              <div className="rounded-md border border-evm-steel/40 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                  Всего действий
                </p>
                <p className="mt-2 text-2xl font-semibold">{totalActions}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">
                Топ пользователей по активности
              </h3>
              <div className="space-y-2">
                {topUsers.slice(0, 5).map((user, index) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between rounded-md border border-evm-steel/40 bg-black/40 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-evm-accent/20 text-xs font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{user.userName}</p>
                        <p className="text-xs text-evm-muted">{user.userEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{user.totalActions}</p>
                      <p className="text-xs text-evm-muted">
                        {user.tasksCompleted} заданий
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-evm-steel/20">
                    <th className="pb-2 uppercase tracking-[0.18em] text-evm-muted">
                      Пользователь
                    </th>
                    <th className="pb-2 uppercase tracking-[0.18em] text-evm-muted">
                      Заданий выполнено
                    </th>
                    <th className="pb-2 uppercase tracking-[0.18em] text-evm-muted">
                      Недель завершено
                    </th>
                    <th className="pb-2 uppercase tracking-[0.18em] text-evm-muted">
                      Всего действий
                    </th>
                    <th className="pb-2 uppercase tracking-[0.18em] text-evm-muted">
                      Последняя активность
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {userStats.map((user) => (
                    <tr
                      key={user.userId}
                      className="border-b border-evm-steel/10"
                    >
                      <td className="py-3">
                        <div>
                          <p className="font-semibold">{user.userName}</p>
                          <p className="text-evm-muted">{user.userEmail}</p>
                        </div>
                      </td>
                      <td className="py-3">{user.tasksCompleted}</td>
                      <td className="py-3">{user.weeksCompleted}</td>
                      <td className="py-3">{user.totalActions}</td>
                      <td className="py-3 text-evm-muted">
                        {user.lastActivityAt
                          ? new Date(user.lastActivityAt).toLocaleDateString("ru-RU")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">
                Выполнение заданий по неделям
              </h3>
              <div className="space-y-2">
                {taskByWeek.map((stat) => (
                  <div
                    key={stat.week}
                    className="rounded-md border border-evm-steel/40 bg-black/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          Неделя {stat.week}: {stat.levelTitle}
                        </p>
                        <p className="text-xs text-evm-muted">
                          {stat.tasksCompleted} заданий выполнено
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{stat.usersCompleted}</p>
                        <p className="text-xs text-evm-muted">пользователей</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">
                Статистика по заданиям
              </h3>
              <div className="space-y-2">
                {taskStats.slice(0, 10).map((stat) => (
                  <div
                    key={stat.taskId}
                    className="rounded-md border border-evm-steel/40 bg-black/40 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{stat.taskTitle}</p>
                        <p className="text-xs text-evm-muted">
                          Неделя {stat.levelWeek} • {stat.taskType}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{stat.completedCount}</p>
                        <p className="text-xs text-evm-muted">выполнений</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">
                Активность по дням
              </h3>
              <div className="space-y-2">
                {Object.entries(
                  weeklyActivity.reduce(
                    (acc, stat) => {
                      if (!acc[stat.date]) {
                        acc[stat.date] = [];
                      }
                      acc[stat.date].push(stat);
                      return acc;
                    },
                    {} as Record<string, WeeklyActivityStat[]>,
                  ),
                )
                  .slice(0, 14)
                  .map(([date, stats]) => (
                    <div
                      key={date}
                      className="rounded-md border border-evm-steel/40 bg-black/40 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          {new Date(date).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-evm-muted">
                          {stats.reduce((sum, s) => sum + s.count, 0)} действий
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {stats.map((stat) => (
                          <div
                            key={`${date}-${stat.actionType}`}
                            className="rounded border border-evm-steel/20 bg-black/20 px-2 py-1"
                          >
                            <p className="text-xs">
                              {stat.actionType}: {stat.count}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

