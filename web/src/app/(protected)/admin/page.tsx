"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConsoleFrame } from "@/components/ui/console-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MetricsPanel } from "@/components/admin/metrics-panel";
import { api } from "@/services/api";
import type { AdminMetrics, Level, Task, Iteration } from "@/types/contracts";

type TaskSubmission = {
  id: string;
  taskId: string;
  userId: string;
  payload: Record<string, unknown>;
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

export default function AdminPage() {
  const [levels, setLevels] = useState<LevelWithIteration[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    status: "accepted" as "accepted" | "rejected" | "pending",
    hint: "",
    message: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [levelsResponse, metricsResponse, iterationsResponse] =
          await Promise.all([
            api.getAdminLevels(),
            api.getAdminMetrics(),
            api.getAdminIterations(),
          ]);
        setLevels(levelsResponse);
        setMetrics(metricsResponse);
        setIterations(iterationsResponse);

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
        try {
          const submissionsResponse = await api.getAdminSubmissions();
          setSubmissions(submissionsResponse);
        } catch {
          setSubmissions([]);
        }
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

  const loadSubmissions = async () => {
    try {
      const submissionsResponse = await api.getAdminSubmissions();
      setSubmissions(submissionsResponse);
    } catch (error) {
      toast.error("Не удалось загрузить отправки", {
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
      status: (submission.status as "accepted" | "rejected" | "pending") || "pending",
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
        {/* Levels Section */}
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
            {levels.map((level) => (
              <div
                key={level.id}
                className="space-y-3 rounded-md border border-evm-steel/40 bg-black/40 p-4"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
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
                {tasks[level.id] && tasks[level.id].length > 0 && (
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
              </div>
            ))}
            {levels.length === 0 ? (
              <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                Уровни не найдены. Добавьте первый.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Submissions Moderation Section */}
        <Card>
          <CardHeader>
            <CardTitle>Модерация отправок заданий</CardTitle>
            <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
              Просмотр и модерация ответов пользователей
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="rounded-md border border-evm-steel/40 bg-black/40 p-4"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                      {submission.taskTitle || "Задача"} ({submission.taskType})
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                      Пользователь: {submission.userName || submission.userEmail} • Статус: {submission.status} •{" "}
                      {new Date(submission.createdAt).toLocaleString("ru-RU")}
                    </p>
                    <div className="mt-2 rounded border border-evm-steel/20 bg-black/20 p-2">
                      <p className="text-xs text-evm-muted">Ответ:</p>
                      <pre className="mt-1 text-xs">
                        {JSON.stringify(submission.payload, null, 2)}
                      </pre>
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
            {submissions.length === 0 ? (
              <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                Отправки не найдены.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {metrics ? <MetricsPanel metrics={metrics} /> : null}
      </ConsoleFrame>

      {/* Level Form Modal */}
      {showLevelForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>
                {editingLevel ? "Редактировать уровень" : "Создать уровень"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowLevelForm(false)}
                >
                  Отмена
                </Button>
                <Button onClick={handleSaveLevel}>Сохранить</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>
                {editingTask ? "Редактировать задачу" : "Создать задачу"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowTaskForm(false)}
                >
                  Отмена
                </Button>
                <Button onClick={handleSaveTask}>Сохранить</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submission Moderation Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Модерация отправки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <pre className="mt-1 overflow-auto text-xs">
                  {JSON.stringify(selectedSubmission.payload, null, 2)}
                </pre>
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
                      status: e.target.value as "accepted" | "rejected" | "pending",
                    })
                  }
                >
                  <option value="pending">На рассмотрении</option>
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
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSubmission(null)}
                >
                  Отмена
                </Button>
                <Button onClick={handleSaveSubmission}>Сохранить</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
