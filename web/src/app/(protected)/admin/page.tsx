"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";

import { ConsoleFrame } from "@/components/ui/console-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AnalyticsPanel } from "@/components/admin/analytics-panel";
import { MetricsPanel } from "@/components/admin/metrics-panel";
import { api } from "@/services/api";
import type { AdminMetrics, Level, Task, Iteration } from "@/types/contracts";
import { cn } from "@/lib/utils";

// Helper function to resolve photo URL to absolute URL
function resolvePhotoUrl(photo: string): string {
  if (photo.startsWith("http://") || photo.startsWith("https://")) {
    return photo;
  }
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";
  // Encode the path part of the URL to handle spaces and special characters
  const path = photo.startsWith("/") ? photo : `/${photo}`;
  // Split path into segments and encode each segment separately
  // This ensures that spaces and special characters in filenames are properly encoded
  const pathSegments = path.split("/").map(segment => {
    if (!segment) return segment;
    // Encode each segment but preserve slashes
    return encodeURIComponent(segment);
  });
  const encodedPath = pathSegments.join("/");
  return `${apiBaseUrl}${encodedPath}`;
}

type TaskSubmission = {
  id: string;
  taskId: string;
  userId: string;
  payload: {
    photos?: string[];
    survey?: Record<string, string>;
    text?: string;
    [key: string]: unknown;
  };
  status: string;
  hint: string | null;
  message: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  taskTitle: string | null;
  taskType: string | null;
};

type LevelWithIteration = Level & { iterationId?: string };
type AdminTabId = "levels" | "submissions" | "metrics" | "analytics";

export default function AdminPage() {
  const [levels, setLevels] = useState<LevelWithIteration[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIteration, setActiveIteration] = useState<Iteration | null>(null);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected" | "revision">("all");
  const [collapsedSubmissionGroups, setCollapsedSubmissionGroups] = useState<Set<string>>(new Set());
  const [submissionPage, setSubmissionPage] = useState(1);
  const [activeTab, setActiveTab] = useState<AdminTabId>("levels");
  const SUBMISSIONS_PER_PAGE = 10;

  // Level form state
  const [showLevelForm, setShowLevelForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [levelForm, setLevelForm] = useState({
    week: "",
    title: "",
    state: "scheduled" as Level["state"],
    opensAt: "",
    closesAt: "",
    storyline: "",
    hint: "",
    iterationId: "",
  });

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    type: "quiz" as Task["type"],
    title: "",
    description: "",
    points: "",
    config: "{}",
  });

  // Submission moderation state
  const [selectedSubmission, setSelectedSubmission] =
    useState<TaskSubmission | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    status: "accepted" as "accepted" | "rejected" | "pending" | "revision",
    hint: "",
    message: "",
  });

  const loadSubmissions = useCallback(async () => {
    try {
      const submissionsResponse = await api.getAdminSubmissions();
      setSubmissions(submissionsResponse);
    } catch {
      setSubmissions([]);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [levelsResponse, metricsResponse, iterationsResponse] =
          await Promise.all([
            api.getAdminLevels(),
            api.getAdminMetrics(),
            api.getAdminIterations(),
          ]);

        if (!isMounted) return;

        setLevels(levelsResponse);
        setMetrics(metricsResponse);
        setIterations(iterationsResponse);

        // Find active iteration (the one with the most recent start date or current date range)
        const now = new Date();
        const active = iterationsResponse.find(
          (iter) =>
            new Date(iter.startsAt) <= now && new Date(iter.endsAt) >= now
        ) || iterationsResponse[0];
        setActiveIteration(active || null);

        // Load tasks for each level
        const tasksMap: Record<string, Task[]> = {};
        for (const level of levelsResponse) {
          try {
            const levelTasks = await api.getAdminTasks(level.id);
            tasksMap[level.id] = levelTasks;
          } catch {
            tasksMap[level.id] = [];
          }
        }
        setTasks(tasksMap);

        // Load submissions
        await loadSubmissions();
      } catch (error) {
        if (!isMounted) return;
        toast.error("Не удалось загрузить панель администратора", {
          description:
            error instanceof Error ? error.message : "Сбой матрицы E.V.M.",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    void load();

    return () => {
      isMounted = false;
    };
  }, [loadSubmissions]);

  // Reload submissions when page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadSubmissions();
      }
    };

    const handleFocus = () => {
      void loadSubmissions();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadSubmissions]);

  // Reset page if current page is out of bounds after filtering
  useEffect(() => {
    const filteredSubmissions = submissionStatusFilter === "all"
      ? submissions
      : submissions.filter(s => s.status === submissionStatusFilter);
    const totalPages = Math.ceil(filteredSubmissions.length / SUBMISSIONS_PER_PAGE);
    if (submissionPage > totalPages && totalPages > 0) {
      setSubmissionPage(1);
    } else if (totalPages === 0 && submissionPage > 1) {
      setSubmissionPage(1);
    }
  }, [submissions, submissionStatusFilter]); // Removed submissionPage from deps to avoid infinite loop

  const loadLevelTasks = async (levelId: string) => {
    try {
      const levelTasks = await api.getAdminTasks(levelId);
      setTasks((prev) => ({ ...prev, [levelId]: levelTasks }));
    } catch (error) {
      toast.error("Не удалось загрузить задачи", {
        description:
          error instanceof Error ? error.message : "Ошибка загрузки",
      });
    }
  };


  const handleCreateLevel = () => {
    setEditingLevel(null);
    setLevelForm({
      week: "",
      title: "",
      state: "scheduled",
      opensAt: "",
      closesAt: "",
      storyline: "",
      hint: "",
      iterationId: iterations[0]?.id || "",
    });
    setShowLevelForm(true);
  };

  const handleEditLevel = (level: LevelWithIteration) => {
    setEditingLevel(level);
    const opensAtDate = new Date(level.opensAt);
    const closesAtDate = new Date(level.closesAt);
    setLevelForm({
      week: level.week.toString(),
      title: level.title,
      state: level.state,
      opensAt: opensAtDate.toISOString().slice(0, 16),
      closesAt: closesAtDate.toISOString().slice(0, 16),
      storyline: level.config.storyline,
      hint: level.config.hint || "",
      iterationId: level.iterationId || iterations[0]?.id || "",
    });
    setShowLevelForm(true);
  };

  const handleSaveLevel = async () => {
    try {
      const levelData: LevelWithIteration = {
        id: editingLevel?.id || crypto.randomUUID(),
        week: parseInt(levelForm.week, 10),
        title: levelForm.title,
        state: levelForm.state,
        opensAt: new Date(levelForm.opensAt).toISOString(),
        closesAt: new Date(levelForm.closesAt).toISOString(),
        config: {
          storyline: levelForm.storyline,
          hint: levelForm.hint || undefined,
        },
        iterationId: levelForm.iterationId || undefined,
      };

      if (editingLevel) {
        await api.updateAdminLevel(editingLevel.id, levelData);
        toast.success("Уровень обновлён");
      } else {
        await api.createAdminLevel(levelData);
        toast.success("Уровень создан");
      }

      setShowLevelForm(false);
      const updatedLevels = await api.getAdminLevels();
      setLevels(updatedLevels);
    } catch (error) {
      toast.error("Не удалось сохранить уровень", {
        description:
          error instanceof Error ? error.message : "Ошибка сохранения",
      });
    }
  };

  const handleCreateTask = (levelId: string) => {
    setSelectedLevelId(levelId);
    setEditingTask(null);
    setTaskForm({
      type: "quiz",
      title: "",
      description: "",
      points: "",
      config: "{}",
    });
    setShowTaskForm(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedLevelId(task.levelId);
    setEditingTask(task);
    setTaskForm({
      type: task.type,
      title: task.title,
      description: task.description,
      points: task.points.toString(),
      config: JSON.stringify(task.config, null, 2),
    });
    setShowTaskForm(true);
  };

  const handleSaveTask = async () => {
    if (!selectedLevelId) return;

    try {
      let config: Record<string, unknown> = {};
      try {
        config = JSON.parse(taskForm.config);
      } catch {
        toast.error("Неверный формат JSON в конфигурации");
        return;
      }

      const taskData: Omit<Task, "id" | "levelId"> & { id?: string } = {
        id: editingTask?.id,
        type: taskForm.type,
        title: taskForm.title,
        description: taskForm.description,
        points: parseInt(taskForm.points, 10),
        config,
      };

      if (editingTask) {
        await api.updateAdminTask(editingTask.id, {
          ...taskData,
          levelId: selectedLevelId,
        });
        toast.success("Задача обновлена");
      } else {
        await api.createAdminTask(selectedLevelId, taskData);
        toast.success("Задача создана");
      }

      setShowTaskForm(false);
      await loadLevelTasks(selectedLevelId);
    } catch (error) {
      toast.error("Не удалось сохранить задачу", {
        description:
          error instanceof Error ? error.message : "Ошибка сохранения",
      });
    }
  };

  const handleDeleteTask = async (taskId: string, levelId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту задачу?")) return;

    try {
      await api.deleteAdminTask(taskId);
      toast.success("Задача удалена");
      await loadLevelTasks(levelId);
    } catch (error) {
      toast.error("Не удалось удалить задачу", {
        description:
          error instanceof Error ? error.message : "Ошибка удаления",
      });
    }
  };

  const handleModerateSubmission = (submission: TaskSubmission) => {
    setSelectedSubmission(submission);
    setSubmissionForm({
      status: (submission.status as "accepted" | "rejected" | "pending" | "revision") || "pending",
      hint: submission.hint || "",
      message: submission.message || "",
    });
  };

  const handleSaveSubmission = async () => {
    if (!selectedSubmission) return;

    try {
      await api.updateAdminSubmission(selectedSubmission.id, {
        status: submissionForm.status,
        hint: submissionForm.hint || null,
        message: submissionForm.message || null,
      });
      toast.success("Отправка обновлена");
      setSelectedSubmission(null);
      await loadSubmissions();
    } catch (error) {
      toast.error("Не удалось обновить отправку", {
        description:
          error instanceof Error ? error.message : "Ошибка обновления",
      });
    }
  };

  useEffect(() => {
    if (!metrics && activeTab === "metrics") {
      setActiveTab("levels");
    }
  }, [metrics, activeTab]);

  const pendingSubmissionCount = useMemo(
    () => submissions.filter((submission) => submission.status === "pending").length,
    [submissions]
  );

  const adminTabs = useMemo(
    () =>
      [
        {
          id: "levels" as const,
          label: "Уровни",
          description: "Контент недель, задания и сроки",
          badge: levels.length,
        },
        {
          id: "submissions" as const,
          label: "Отправки",
          description:
            pendingSubmissionCount > 0
              ? `Новые: ${pendingSubmissionCount}`
              : "Модерация ответов игроков",
          badge: submissions.length,
        },
        {
          id: "metrics" as const,
          label: "Метрики",
          description: metrics ? "DAU, WAU и воронки" : "Нет данных для показа",
          disabled: !metrics,
        },
        {
          id: "analytics" as const,
          label: "Аналитика",
          description: "Сводка активности за период",
        },
      ] satisfies Array<{
        id: AdminTabId;
        label: string;
        description: string;
        badge?: number;
        disabled?: boolean;
      }>,
    [levels.length, submissions.length, pendingSubmissionCount, metrics]
  );

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {adminTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-md border border-evm-steel/30 bg-black/40 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evm-accent/50",
                tab.disabled && "cursor-not-allowed opacity-40",
                activeTab === tab.id
                  ? "border-evm-accent/60 bg-evm-accent/10 shadow-[0_0_20px_rgba(184,71,63,0.2)]"
                  : "hover:border-evm-accent/40 hover:bg-evm-accent/5"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                  {tab.label}
                </p>
                {typeof tab.badge === "number" ? (
                  <span className="rounded-md border border-evm-steel/40 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-evm-muted">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-evm-muted">
                {tab.description}
              </p>
            </button>
          ))}
        </div>

        {activeTab === "levels" && (
          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Уровни</CardTitle>
                <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
                  Управление контентом уровней и сроками
                </p>
              </div>
              <Button onClick={handleCreateLevel}>Создать уровень</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {levels.map((level) => {
                const isCollapsed = collapsedWeeks.has(level.id);
                const isActive =
                  activeIteration &&
                  level.week === activeIteration.currentWeek &&
                  (level.iterationId === activeIteration.id ||
                    (!level.iterationId && activeIteration));

                return (
                  <div
                    key={level.id}
                    className="space-y-3 rounded-md border border-evm-steel/40 bg-black/40 p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <div className="flex items-start gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setCollapsedWeeks((prev) => {
                              const next = new Set(prev);
                              if (next.has(level.id)) {
                                next.delete(level.id);
                              } else {
                                next.add(level.id);
                              }
                              return next;
                            });
                          }}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                              Неделя {level.week}: {level.title}
                            </p>
                            {isActive && (
                              <span className="rounded-md border border-evm-accent/50 bg-evm-accent/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-evm-accent">
                                Активная
                              </span>
                            )}
                          </div>
                          <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                            Состояние: {level.state} • Открывается{" "}
                            {new Date(level.opensAt).toLocaleString("ru-RU")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {activeIteration && (
                          <Button
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            onClick={async () => {
                              try {
                                const updated = await api.setAdminIterationWeek(
                                  activeIteration.id,
                                  level.week
                                );
                                setActiveIteration(updated);
                                const updatedIterations = await api.getAdminIterations();
                                setIterations(updatedIterations);
                                toast.success(`Неделя ${level.week} установлена как активная`);
                                const updatedLevels = await api.getAdminLevels();
                                setLevels(updatedLevels);
                              } catch (error) {
                                toast.error("Не удалось установить активную неделю", {
                                  description:
                                    error instanceof Error ? error.message : "Ошибка обновления",
                                });
                              }
                            }}
                            className={isActive ? "bg-evm-accent text-white" : ""}
                          >
                            {isActive ? "Активна" : "Сделать активной"}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditLevel(level)}
                        >
                          Редактировать
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCreateTask(level.id)}
                        >
                          Добавить задачу
                        </Button>
                      </div>
                    </div>

                    {/* Tasks for this level */}
                    {!isCollapsed && tasks[level.id] && tasks[level.id].length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-evm-steel/20 pt-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                          Задачи ({tasks[level.id].length}):
                        </p>
                        {tasks[level.id].map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between rounded border border-evm-steel/20 bg-black/20 p-2"
                          >
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                                {task.title} ({task.type})
                              </p>
                              <p className="text-xs text-evm-muted">
                                {task.points} баллов
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditTask(task)}
                              >
                                Редактировать
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTask(task.id, level.id)}
                              >
                                Удалить
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isCollapsed && (!tasks[level.id] || tasks[level.id].length === 0) && (
                      <div className="mt-3 border-t border-evm-steel/20 pt-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                          Задачи отсутствуют
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              {levels.length === 0 ? (
                <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                  Уровни не найдены. Добавьте первый.
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}

        {activeTab === "submissions" && (
          <Card>
            <CardHeader>
              <CardTitle>Модерация отправок заданий</CardTitle>
              <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
                Просмотр и модерация ответов пользователей
              </p>
              {/* Status Filter Tabs */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={submissionStatusFilter === "all" ? "default" : "outline"}
                  onClick={() => {
                    setSubmissionStatusFilter("all");
                    setSubmissionPage(1);
                  }}
                >
                  Все ({submissions.length})
                </Button>
                <Button
                  size="sm"
                  variant={submissionStatusFilter === "pending" ? "default" : "outline"}
                  onClick={() => {
                    setSubmissionStatusFilter("pending");
                    setSubmissionPage(1);
                  }}
                  className={submissionStatusFilter === "pending" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                >
                  На рассмотрении ({submissions.filter(s => s.status === "pending").length})
                </Button>
                <Button
                  size="sm"
                  variant={submissionStatusFilter === "accepted" ? "default" : "outline"}
                  onClick={() => {
                    setSubmissionStatusFilter("accepted");
                    setSubmissionPage(1);
                  }}
                  className={submissionStatusFilter === "accepted" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Принято ({submissions.filter(s => s.status === "accepted").length})
                </Button>
                <Button
                  size="sm"
                  variant={submissionStatusFilter === "rejected" ? "default" : "outline"}
                  onClick={() => {
                    setSubmissionStatusFilter("rejected");
                    setSubmissionPage(1);
                  }}
                  className={submissionStatusFilter === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  Отклонено ({submissions.filter(s => s.status === "rejected").length})
                </Button>
                <Button
                  size="sm"
                  variant={submissionStatusFilter === "revision" ? "default" : "outline"}
                  onClick={() => {
                    setSubmissionStatusFilter("revision");
                    setSubmissionPage(1);
                  }}
                  className={submissionStatusFilter === "revision" ? "bg-orange-600 hover:bg-orange-700" : ""}
                >
                  На доработке ({submissions.filter(s => s.status === "revision").length})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                // Filter submissions by status
                const filteredSubmissions = submissionStatusFilter === "all"
                  ? submissions
                  : submissions.filter(s => s.status === submissionStatusFilter);

                // Sort submissions: by status (pending first, then revision), then by date (newest first)
                const statusOrder = ["pending", "revision", "accepted", "rejected"];
                const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
                  const aStatus = a.status || "pending";
                  const bStatus = b.status || "pending";
                  const aIndex = statusOrder.indexOf(aStatus);
                  const bIndex = statusOrder.indexOf(bStatus);

                  if (aIndex !== bIndex) {
                    if (aIndex === -1) return 1;
                    if (bIndex === -1) return -1;
                    return aIndex - bIndex;
                  }

                  // Same status, sort by date (newest first)
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });

                // Apply pagination
                const totalSubmissions = sortedSubmissions.length;
                const totalPages = Math.ceil(totalSubmissions / SUBMISSIONS_PER_PAGE);
                const startIndex = (submissionPage - 1) * SUBMISSIONS_PER_PAGE;
                const endIndex = startIndex + SUBMISSIONS_PER_PAGE;
                const paginatedSubmissions = sortedSubmissions.slice(startIndex, endIndex);

                // Group paginated submissions by status, then by task
                const groupedByStatus: Record<string, Record<string, TaskSubmission[]>> = {};

                paginatedSubmissions.forEach((submission) => {
                  const status = submission.status || "pending";
                  const taskKey = `${submission.taskId || "unknown"}_${submission.taskTitle || "Задача"}`;

                  if (!groupedByStatus[status]) {
                    groupedByStatus[status] = {};
                  }
                  if (!groupedByStatus[status][taskKey]) {
                    groupedByStatus[status][taskKey] = [];
                  }
                  groupedByStatus[status][taskKey].push(submission);
                });

                // Sort statuses: pending first, then revision, then accepted, then rejected
                const sortedStatuses = Object.keys(groupedByStatus).sort((a, b) => {
                  const aIndex = statusOrder.indexOf(a);
                  const bIndex = statusOrder.indexOf(b);
                  if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                  if (aIndex === -1) return 1;
                  if (bIndex === -1) return -1;
                  return aIndex - bIndex;
                });

                if (sortedStatuses.length === 0) {
                  return (
                    <>
                      <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                        Отправки не найдены.
                      </p>
                    </>
                  );
                }

                return (
                  <>
                    {sortedStatuses.map((status) => {
                      const statusLabel = {
                        pending: "На рассмотрении",
                        revision: "На доработке",
                        accepted: "Принято",
                        rejected: "Отклонено",
                      }[status] || status;

                      const statusColor = {
                        pending: "border-yellow-500/50 bg-yellow-500/10",
                        revision: "border-orange-500/50 bg-orange-500/10",
                        accepted: "border-green-500/50 bg-green-500/10",
                        rejected: "border-red-500/50 bg-red-500/10",
                      }[status] || "border-evm-steel/40 bg-black/40";

                      const statusGroupKey = `status_${status}`;
                      const isStatusCollapsed = collapsedSubmissionGroups.has(statusGroupKey);
                      const tasksInStatus = groupedByStatus[status];
                      const taskKeys = Object.keys(tasksInStatus).sort();

                      return (
                        <div
                          key={status}
                          className={`rounded-md border ${statusColor} p-4`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setCollapsedSubmissionGroups((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(statusGroupKey)) {
                                      next.delete(statusGroupKey);
                                    } else {
                                      next.add(statusGroupKey);
                                    }
                                    return next;
                                  });
                                }}
                              >
                                {isStatusCollapsed ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronUp className="h-4 w-4" />
                                )}
                              </Button>
                              <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                                {statusLabel} ({filteredSubmissions.filter(s => s.status === status).length})
                              </p>
                            </div>
                          </div>

                          {!isStatusCollapsed && (
                            <div className="space-y-3">
                              {taskKeys.map((taskKey) => {
                                const taskSubmissions = tasksInStatus[taskKey];
                                const firstSubmission = taskSubmissions[0];
                                const taskTitle = firstSubmission.taskTitle || "Задача";
                                const taskType = firstSubmission.taskType || "unknown";
                                const taskGroupKey = `${statusGroupKey}_${taskKey}`;
                                const isTaskCollapsed = collapsedSubmissionGroups.has(taskGroupKey);

                                return (
                                  <div
                                    key={taskKey}
                                    className="rounded-md border border-evm-steel/30 bg-black/30 p-3"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 w-5 p-0"
                                          onClick={() => {
                                            setCollapsedSubmissionGroups((prev) => {
                                              const next = new Set(prev);
                                              if (next.has(taskGroupKey)) {
                                                next.delete(taskGroupKey);
                                              } else {
                                                next.add(taskGroupKey);
                                              }
                                              return next;
                                            });
                                          }}
                                        >
                                          {isTaskCollapsed ? (
                                            <ChevronDown className="h-3 w-3" />
                                          ) : (
                                            <ChevronUp className="h-3 w-3" />
                                          )}
                                        </Button>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                                          {taskTitle} ({taskType}) — {taskSubmissions.length} отправок
                                        </p>
                                      </div>
                                    </div>

                                    {!isTaskCollapsed && (
                                      <div className="space-y-2 mt-2">
                                        {taskSubmissions.map((submission) => (
                                          <div
                                            key={submission.id}
                                            className="rounded-md border border-evm-steel/20 bg-black/20 p-3"
                                          >
                                            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                                              <div>
                                                <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                                                  Пользователь: {submission.userName || submission.userEmail} •{" "}
                                                  {new Date(submission.createdAt).toLocaleString("ru-RU")}
                                                </p>
                                                <div className="mt-2 rounded border border-evm-steel/20 bg-black/20 p-2">
                                                  <p className="text-xs text-evm-muted">Ответ:</p>
                                                  <div className="mt-1 space-y-2">
                                                    {/* Display photos if present */}
                                                    {submission.payload.photos &&
                                                      Array.isArray(submission.payload.photos) &&
                                                      submission.payload.photos.length > 0 && (
                                                        <div className="space-y-1">
                                                          <p className="text-xs font-semibold text-evm-muted">
                                                            Фото ({submission.payload.photos.length}):
                                                          </p>
                                                          <div className="grid grid-cols-2 gap-1">
                                                            {(submission.payload.photos as string[])
                                                              .slice(0, 2)
                                                              .map((photo: string, index: number) => (
                                                                <img
                                                                  key={index}
                                                                  src={resolvePhotoUrl(photo)}
                                                                  alt={`Photo ${index + 1}`}
                                                                  className="h-16 w-full rounded object-cover"
                                                                  onError={(e) => {
                                                                    console.error("Failed to load image:", resolvePhotoUrl(photo));
                                                                    (e.target as HTMLImageElement).style.display = "none";
                                                                  }}
                                                                />
                                                              ))}
                                                          </div>
                                                        </div>
                                                      )}

                                                    {/* Display survey if present */}
                                                    {submission.payload.survey &&
                                                      typeof submission.payload.survey === "object" &&
                                                      submission.payload.survey !== null &&
                                                      Object.keys(submission.payload.survey).length > 0 && (
                                                        <p className="text-xs text-evm-muted">
                                                          Опрос: {Object.keys(submission.payload.survey).length}{" "}
                                                          ответов
                                                        </p>
                                                      )}

                                                    {/* Display text if present */}
                                                    {submission.payload.text && typeof submission.payload.text === "string" && (
                                                      <p className="text-xs text-foreground line-clamp-2">
                                                        {submission.payload.text}
                                                      </p>
                                                    )}

                                                    {/* Fallback */}
                                                    {!submission.payload.photos &&
                                                      !submission.payload.survey &&
                                                      !submission.payload.text && (
                                                        <pre className="text-xs">
                                                          {JSON.stringify(submission.payload, null, 2) as string}
                                                        </pre>
                                                      )}
                                                  </div>
                                                </div>
                                                {submission.message && (
                                                  <p className="mt-2 text-xs text-evm-muted">
                                                    Сообщение: {submission.message}
                                                  </p>
                                                )}
                                              </div>
                                              <div className="flex items-center justify-end">
                                                <Button
                                                  size="sm"
                                                  variant="secondary"
                                                  onClick={() => handleModerateSubmission(submission)}
                                                >
                                                  Модерировать
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-evm-steel/20 pt-4 mt-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                          Показано {startIndex + 1}–{Math.min(endIndex, totalSubmissions)} из {totalSubmissions}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSubmissionPage(prev => Math.max(1, prev - 1))}
                            disabled={submissionPage === 1}
                          >
                            Назад
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum: number;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (submissionPage <= 3) {
                                pageNum = i + 1;
                              } else if (submissionPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = submissionPage - 2 + i;
                              }

                              return (
                                <Button
                                  key={pageNum}
                                  size="sm"
                                  variant={submissionPage === pageNum ? "default" : "outline"}
                                  onClick={() => setSubmissionPage(pageNum)}
                                  className="min-w-[2rem]"
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSubmissionPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={submissionPage === totalPages}
                          >
                            Вперед
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {activeTab === "metrics" && (
          metrics ? (
            <MetricsPanel metrics={metrics} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Метрики недоступны</CardTitle>
                <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
                  Попробуйте обновить страницу или проверьте подключение
                </p>
              </CardHeader>
            </Card>
          )
        )}

        {activeTab === "analytics" ? <AnalyticsPanel /> : null}

      </ConsoleFrame>

      {/* Level Form Modal */}
      {showLevelForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLevelForm(false);
            }
          }}
        >
          <Card
            className="w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex-shrink-0">
              <CardTitle>
                {editingLevel ? "Редактировать уровень" : "Создать уровень"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <Label htmlFor="week">Неделя</Label>
                <Input
                  id="week"
                  type="number"
                  value={levelForm.week}
                  onChange={(e) =>
                    setLevelForm({ ...levelForm, week: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Название</Label>
                <Input
                  id="title"
                  value={levelForm.title}
                  onChange={(e) =>
                    setLevelForm({ ...levelForm, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Состояние</Label>
                <select
                  id="state"
                  className="flex h-11 w-full rounded-md border border-white/10 bg-black/40 px-4 text-sm uppercase tracking-[0.18em] text-foreground"
                  value={levelForm.state}
                  onChange={(e) =>
                    setLevelForm({
                      ...levelForm,
                      state: e.target.value as Level["state"],
                    })
                  }
                >
                  <option value="scheduled">Запланирован</option>
                  <option value="open">Открыт</option>
                  <option value="closed">Закрыт</option>
                </select>
              </div>
              {iterations.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="iterationId">Итерация (опционально)</Label>
                  <select
                    id="iterationId"
                    className="flex h-11 w-full rounded-md border border-white/10 bg-black/40 px-4 text-sm uppercase tracking-[0.18em] text-foreground"
                    value={levelForm.iterationId}
                    onChange={(e) =>
                      setLevelForm({
                        ...levelForm,
                        iterationId: e.target.value,
                      })
                    }
                  >
                    <option value="">Без итерации</option>
                    {iterations.map((iter) => (
                      <option key={iter.id} value={iter.id}>
                        {iter.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="opensAt">Открывается</Label>
                  <Input
                    id="opensAt"
                    type="datetime-local"
                    value={levelForm.opensAt}
                    onChange={(e) =>
                      setLevelForm({ ...levelForm, opensAt: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closesAt">Закрывается</Label>
                  <Input
                    id="closesAt"
                    type="datetime-local"
                    value={levelForm.closesAt}
                    onChange={(e) =>
                      setLevelForm({ ...levelForm, closesAt: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="storyline">Сюжет</Label>
                <Textarea
                  id="storyline"
                  value={levelForm.storyline}
                  onChange={(e) =>
                    setLevelForm({ ...levelForm, storyline: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hint">Подсказка (опционально)</Label>
                <Textarea
                  id="hint"
                  value={levelForm.hint}
                  onChange={(e) =>
                    setLevelForm({ ...levelForm, hint: e.target.value })
                  }
                />
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t border-evm-steel/20 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => setShowLevelForm(false)}
              >
                Отмена
              </Button>
              <Button onClick={handleSaveLevel}>Сохранить</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTaskForm(false);
            }
          }}
        >
          <Card
            className="w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex-shrink-0">
              <CardTitle>
                {editingTask ? "Редактировать задачу" : "Создать задачу"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <Label htmlFor="taskType">Тип задачи</Label>
                <select
                  id="taskType"
                  className="flex h-11 w-full rounded-md border border-white/10 bg-black/40 px-4 text-sm uppercase tracking-[0.18em] text-foreground"
                  value={taskForm.type}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      type: e.target.value as Task["type"],
                    })
                  }
                >
                  <option value="quiz">Викторина</option>
                  <option value="cipher">Шифр</option>
                  <option value="upload">Загрузка</option>
                  <option value="vote">Голосование</option>
                  <option value="qr">QR-код</option>
                  <option value="final">Финальная</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Название</Label>
                <Input
                  id="taskTitle"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDescription">Описание</Label>
                <Textarea
                  id="taskDescription"
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskPoints">Баллы</Label>
                <Input
                  id="taskPoints"
                  type="number"
                  value={taskForm.points}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, points: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskConfig">Конфигурация (JSON)</Label>
                <Textarea
                  id="taskConfig"
                  value={taskForm.config}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, config: e.target.value })
                  }
                  className="font-mono text-xs"
                />
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t border-evm-steel/20 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => setShowTaskForm(false)}
              >
                Отмена
              </Button>
              <Button onClick={handleSaveTask}>Сохранить</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Submission Moderation Modal */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedSubmission(null);
            }
          }}
        >
          <Card
            className="w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex-shrink-0">
              <CardTitle>Модерация отправки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="rounded border border-evm-steel/20 bg-black/20 p-3">
                <p className="text-xs text-evm-muted">Задача:</p>
                <p className="text-sm font-semibold">
                  {selectedSubmission.taskTitle} ({selectedSubmission.taskType})
                </p>
                <p className="mt-2 text-xs text-evm-muted">Пользователь:</p>
                <p className="text-sm">
                  {selectedSubmission.userName || selectedSubmission.userEmail}
                </p>
                <p className="mt-2 text-xs text-evm-muted">Ответ:</p>
                <div className="mt-1 space-y-2">
                  {/* Display photos if present */}
                  {selectedSubmission.payload.photos &&
                    Array.isArray(selectedSubmission.payload.photos) &&
                    selectedSubmission.payload.photos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-evm-muted">
                          Загруженные фото:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {(selectedSubmission.payload.photos as string[]).map(
                            (photo: string, index: number) => (
                              <img
                                key={index}
                                src={resolvePhotoUrl(photo)}
                                alt={`Photo ${index + 1}`}
                                className="h-32 w-full rounded-md object-cover"
                                onError={(e) => {
                                  console.error("Failed to load image:", resolvePhotoUrl(photo));
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* Display survey answers if present */}
                  {selectedSubmission.payload.survey &&
                    typeof selectedSubmission.payload.survey === "object" &&
                    selectedSubmission.payload.survey !== null &&
                    Object.keys(selectedSubmission.payload.survey).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-evm-muted">
                          Ответы на опрос:
                        </p>
                        <div className="space-y-1">
                          {Object.entries(
                            selectedSubmission.payload.survey as Record<
                              string,
                              string
                            >,
                          ).map(([questionId, answer]) => (
                            <div key={questionId} className="text-xs">
                              <span className="font-semibold text-evm-muted">
                                {questionId}:
                              </span>{" "}
                              <span className="text-foreground">{answer}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Display text answer if present */}
                  {selectedSubmission.payload.text && typeof selectedSubmission.payload.text === "string" && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-evm-muted">
                        Текстовый ответ:
                      </p>
                      <p className="text-xs text-foreground">
                        {selectedSubmission.payload.text}
                      </p>
                    </div>
                  )}

                  {/* Fallback to JSON if no structured data */}
                  {!selectedSubmission.payload.photos &&
                    !selectedSubmission.payload.survey &&
                    !selectedSubmission.payload.text && (
                      <pre className="overflow-auto text-xs">
                        {JSON.stringify(selectedSubmission.payload, null, 2) as string}
                      </pre>
                    )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="submissionStatus">Статус</Label>
                <select
                  id="submissionStatus"
                  className="flex h-11 w-full rounded-md border border-white/10 bg-black/40 px-4 text-sm uppercase tracking-[0.18em] text-foreground"
                  value={submissionForm.status}
                  onChange={(e) =>
                    setSubmissionForm({
                      ...submissionForm,
                      status: e.target.value as "accepted" | "rejected" | "pending" | "revision",
                    })
                  }
                >
                  <option value="pending">На рассмотрении</option>
                  <option value="revision">На доработке</option>
                  <option value="accepted">Принято</option>
                  <option value="rejected">Отклонено</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="submissionHint">Подсказка (опционально)</Label>
                <Textarea
                  id="submissionHint"
                  value={submissionForm.hint}
                  onChange={(e) =>
                    setSubmissionForm({ ...submissionForm, hint: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submissionMessage">Сообщение (опционально)</Label>
                <Textarea
                  id="submissionMessage"
                  value={submissionForm.message}
                  onChange={(e) =>
                    setSubmissionForm({
                      ...submissionForm,
                      message: e.target.value,
                    })
                  }
                />
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t border-evm-steel/20 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => setSelectedSubmission(null)}
              >
                Отмена
              </Button>
              <Button onClick={handleSaveSubmission}>Сохранить</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
