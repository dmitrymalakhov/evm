"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { useSessionStore } from "@/store/use-session-store";
import type {
  AdminMetrics,
  Level,
  Task,
  Iteration,
  SecretSantaState,
  SecretSantaAdminState,
  PreCreatedUser,
  Comment,
  Thought,
} from "@/types/contracts";
import { cn } from "@/lib/utils";

// Helper function to resolve photo URL to absolute URL
function resolvePhotoUrl(photo: string | unknown): string {
  try {
    // Handle non-string values
    if (typeof photo !== "string") {
      console.error("resolvePhotoUrl: photo is not a string", { photo, type: typeof photo });
      return "";
    }

    if (!photo || photo.trim() === "") {
      console.error("resolvePhotoUrl: photo is empty");
      return "";
    }

    // If already absolute URL, encode it properly to handle spaces and special characters
    if (photo.startsWith("http://") || photo.startsWith("https://")) {
      try {
        // Try to parse and reconstruct URL properly
        // First, try to use URL constructor - it will throw if URL is invalid (e.g., has spaces)
        try {
          const url = new URL(photo);
          // If successful, URL is valid - return as-is (URL constructor handles encoding)
          console.log("🔵 [resolvePhotoUrl] URL parsed successfully:", { original: photo, parsed: url.toString() });
          return url.toString();
        } catch (urlError) {
          // URL parsing failed (likely due to spaces or special chars) - manually encode
          console.log("🟡 [resolvePhotoUrl] URL parsing failed, encoding manually:", { original: photo, error: urlError });

          // Extract protocol, host, and path manually
          const match = photo.match(/^(https?:\/\/[^\/]+)(\/.*)?$/);
          if (match) {
            const [, base, path = ""] = match;
            // Encode each path segment separately
            const encodedPath = path.split("/").map(segment => {
              if (!segment) return segment;
              // Decode first in case it's already partially encoded, then encode properly
              try {
                const decoded = decodeURIComponent(segment);
                return encodeURIComponent(decoded);
              } catch {
                // If decoding fails, just encode as-is
                return encodeURIComponent(segment);
              }
            }).join("/");
            const resolvedUrl = base + encodedPath;
            console.log("🔵 [resolvePhotoUrl] Manually encoded URL:", { original: photo, resolved: resolvedUrl });
            return resolvedUrl;
          }
        }
      } catch (encodeError) {
        console.error("🔴 [resolvePhotoUrl] Failed to encode URL:", { photo, error: encodeError });
      }
      // Last resort: return as-is (browser may handle it, or we'll see error in console)
      console.warn("🔴 [resolvePhotoUrl] Returning URL as-is (last resort):", photo);
      return photo;
    }

    // Relative URL - convert to absolute
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";
    const path = photo.startsWith("/") ? photo : `/${photo}`;
    // Split path into segments and encode each segment separately
    const pathSegments = path.split("/").map(segment => {
      if (!segment) return segment;
      return encodeURIComponent(segment);
    });
    const encodedPath = pathSegments.join("/");
    const resolvedUrl = `${apiBaseUrl}${encodedPath}`;
    console.log("🔵 [resolvePhotoUrl] Resolved relative URL:", { original: photo, resolved: resolvedUrl });
    return resolvedUrl;
  } catch (error) {
    console.error("🔴 [resolvePhotoUrl] Error processing photo", { photo, error });
    return "";
  }
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
type AdminTabId = "levels" | "submissions" | "metrics" | "analytics" | "secret-santa" | "users" | "feed";

export default function AdminPage() {
  const router = useRouter();
  const { user, hasHydrated } = useSessionStore();
  const [levels, setLevels] = useState<LevelWithIteration[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [secretSantaState, setSecretSantaState] = useState<SecretSantaAdminState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIteration, setActiveIteration] = useState<Iteration | null>(null);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected" | "revision">("all");
  const [collapsedSubmissionGroups, setCollapsedSubmissionGroups] = useState<Set<string>>(new Set());
  const [submissionPage, setSubmissionPage] = useState(1);
  const [activeTab, setActiveTab] = useState<AdminTabId>("levels");
  const [preCreatedUsers, setPreCreatedUsers] = useState<PreCreatedUser[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{
    id: string;
    email: string;
    name: string;
    role: "user" | "mod" | "admin";
    teamId?: string;
    title?: string;
    avatarUrl?: string;
    tabNumber: string;
    otpCode: string;
    status: "active" | "pending";
    telegramId?: string;
    grade?: number;
    hasPaid?: boolean;
    createdAt: string;
    updatedAt: string;
  }>>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<PreCreatedUser | {
    id: string;
    email: string;
    name: string;
    role: "user" | "mod" | "admin";
    teamId?: string;
    title?: string;
    avatarUrl?: string;
    tabNumber: string;
    otpCode: string;
    status: "active" | "pending";
    telegramId?: string;
    grade?: number;
    hasPaid?: boolean;
    createdAt: string;
    updatedAt: string;
  } | null>(null);
  const [userForm, setUserForm] = useState({
    email: "",
    name: "",
    role: "user" as "user" | "mod" | "admin",
    teamId: "",
    title: "",
    tabNumber: "",
    otpCode: "",
    status: "active" as "active" | "pending",
    grade: "" as string | number,
    hasPaid: false as boolean | null,
  });
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

  // Feed news form state
  const [showFeedForm, setShowFeedForm] = useState(false);
  const [feedForm, setFeedForm] = useState({
    body: "",
  });
  const [feedComments, setFeedComments] = useState<Comment[]>([]);

  // Thoughts form state
  const [showThoughtForm, setShowThoughtForm] = useState(false);
  const [editingThought, setEditingThought] = useState<Thought | null>(null);
  const [thoughtForm, setThoughtForm] = useState({
    text: "",
  });
  const [thoughts, setThoughts] = useState<Thought[]>([]);

  const loadSubmissions = useCallback(async () => {
    try {
      const submissionsResponse = await api.getAdminSubmissions();
      console.log("🔵 [ADMIN] Loaded submissions:", {
        count: submissionsResponse.length,
        submissionsWithPhotos: submissionsResponse.filter(s => s.payload?.photos).length,
      });

      // Log submissions with photos for debugging
      submissionsResponse.forEach((submission) => {
        if (submission.payload?.photos) {
          console.log("🔵 [ADMIN] Submission with photos:", {
            id: submission.id,
            taskId: submission.taskId,
            photos: submission.payload.photos,
            photosType: typeof submission.payload.photos,
            isArray: Array.isArray(submission.payload.photos),
          });
        }
      });

      setSubmissions(submissionsResponse);
    } catch (error) {
      console.error("🔴 [ADMIN] Error loading submissions:", error);
      setSubmissions([]);
    }
  }, []);

  const loadSecretSanta = useCallback(async () => {
    try {
      const state = await api.getSecretSantaAdminState();
      setSecretSantaState(state);
    } catch (error) {
      toast.error("Не удалось загрузить данные Тайного Санты", {
        description: error instanceof Error ? error.message : "Ошибка загрузки",
      });
      setSecretSantaState(null);
    }
  }, []);

  const loadPreCreatedUsers = useCallback(async () => {
    try {
      const users = await api.getPreCreatedUsers();
      setPreCreatedUsers(users);
    } catch (error) {
      toast.error("Не удалось загрузить предзаполненных пользователей", {
        description: error instanceof Error ? error.message : "Ошибка загрузки",
      });
      setPreCreatedUsers([]);
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      const users = await api.getAdminUsers();
      setAllUsers(users);
    } catch (error) {
      toast.error("Не удалось загрузить пользователей", {
        description: error instanceof Error ? error.message : "Ошибка загрузки",
      });
      setAllUsers([]);
    }
  }, []);

  const loadFeedComments = useCallback(async () => {
    try {
      const feed = await api.getFeed();
      // Фильтруем только комментарии с entityType === "feed"
      const feedCommentsList = feed.comments.filter(
        (comment) => comment.entityType === "feed"
      );
      setFeedComments(feedCommentsList);
    } catch (error) {
      toast.error("Не удалось загрузить новости", {
        description: error instanceof Error ? error.message : "Ошибка загрузки",
      });
      setFeedComments([]);
    }
  }, []);

  const loadThoughts = useCallback(async () => {
    try {
      const thoughtsList = await api.getAdminThoughts();
      setThoughts(thoughtsList);
    } catch (error) {
      toast.error("Не удалось загрузить мысли", {
        description: error instanceof Error ? error.message : "Ошибка загрузки",
      });
      setThoughts([]);
    }
  }, []);

  const handleCreateFeedNews = async () => {
    if (!feedForm.body.trim()) {
      toast.error("Текст новости не может быть пустым");
      return;
    }

    try {
      await api.postComment({
        entityType: "feed",
        entityId: "feed", // Используем фиксированный ID для новостей в feed
        body: feedForm.body,
      });
      toast.success("Новость добавлена");
      setFeedForm({ body: "" });
      setShowFeedForm(false);
      await loadFeedComments();
    } catch (error) {
      toast.error("Не удалось добавить новость", {
        description:
          error instanceof Error ? error.message : "Ошибка создания",
      });
    }
  };

  const handleCreateThought = () => {
    setEditingThought(null);
    setThoughtForm({ text: "" });
    setShowThoughtForm(true);
  };

  const handleEditThought = (thought: Thought) => {
    setEditingThought(thought);
    setThoughtForm({ text: thought.text });
    setShowThoughtForm(true);
  };

  const handleSaveThought = async () => {
    if (!thoughtForm.text.trim()) {
      toast.error("Текст мысли не может быть пустым");
      return;
    }

    try {
      if (editingThought) {
        await api.updateAdminThought(editingThought.id, thoughtForm.text.trim());
        toast.success("Мысль обновлена");
      } else {
        await api.createAdminThought(thoughtForm.text.trim());
        toast.success("Мысль добавлена");
      }
      setShowThoughtForm(false);
      setThoughtForm({ text: "" });
      await loadThoughts();
    } catch (error) {
      toast.error(editingThought ? "Не удалось обновить мысль" : "Не удалось добавить мысль", {
        description:
          error instanceof Error ? error.message : "Ошибка сохранения",
      });
    }
  };

  const handleDeleteThought = async (thoughtId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту мысль?")) {
      return;
    }

    try {
      await api.deleteAdminThought(thoughtId);
      toast.success("Мысль удалена");
      await loadThoughts();
    } catch (error) {
      toast.error("Не удалось удалить мысль", {
        description:
          error instanceof Error ? error.message : "Ошибка удаления",
      });
    }
  };

  // Проверка прав доступа
  useEffect(() => {
    if (hasHydrated && user && user.role !== "admin") {
      toast.error("У вас нет доступа к этой странице");
      router.push("/dashboard");
    }
  }, [user, hasHydrated, router]);

  useEffect(() => {
    // Не загружаем данные, если пользователь не админ или еще не загружен
    if (!hasHydrated || !user || user.role !== "admin") {
      return;
    }

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

        // Load secret santa if tab is active
        if (activeTab === "secret-santa") {
          await loadSecretSanta();
        }

        // Load pre-created users if tab is active
        if (activeTab === "users") {
          await loadPreCreatedUsers();
        }

        // Load feed comments and thoughts if tab is active
        if (activeTab === "feed") {
          await loadFeedComments();
          await loadThoughts();
        }
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
  }, [loadSubmissions, activeTab, loadSecretSanta, loadFeedComments, loadThoughts]);

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
    console.log("🔵 [ADMIN] Opening submission for moderation:", {
      id: submission.id,
      taskId: submission.taskId,
      payload: submission.payload,
      photos: submission.payload.photos,
      photosType: typeof submission.payload.photos,
      isArray: Array.isArray(submission.payload.photos),
      payloadKeys: Object.keys(submission.payload),
    });
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

  // Load secret santa when tab is activated
  useEffect(() => {
    if (activeTab === "secret-santa") {
      void loadSecretSanta();
    }
  }, [activeTab, loadSecretSanta]);

  // Load users when tab is activated
  useEffect(() => {
    if (activeTab === "users") {
      void loadAllUsers();
      void loadPreCreatedUsers();
    }
  }, [activeTab, loadAllUsers, loadPreCreatedUsers]);

  useEffect(() => {
    if (activeTab === "feed") {
      void loadFeedComments();
      void loadThoughts();
    }
  }, [activeTab, loadFeedComments, loadThoughts]);

  const handleCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      email: "",
      name: "",
      role: "user",
      teamId: "",
      title: "",
      tabNumber: "",
      otpCode: "",
      status: "active",
      grade: "",
      hasPaid: false,
    });
    setShowUserForm(true);
  };

  const handleEditUser = (user: PreCreatedUser | typeof allUsers[0]) => {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId || "",
      title: user.title || "",
      tabNumber: "tabNumber" in user ? user.tabNumber : "",
      otpCode: "otpCode" in user ? user.otpCode : "",
      status: "status" in user ? user.status : "active",
      grade: "grade" in user && user.grade !== undefined ? user.grade : "",
      hasPaid: "hasPaid" in user && user.hasPaid !== undefined ? user.hasPaid : false,
    });
    setShowUserForm(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser && "status" in editingUser && editingUser.status === "pending") {
        // Это pre-created user
        const payload = {
          email: userForm.email || undefined,
          name: userForm.name || undefined,
          role: userForm.role,
          teamId: userForm.teamId || undefined,
          title: userForm.title || undefined,
        };

        await api.updatePreCreatedUser(editingUser.id, payload);
        toast.success("Пользователь обновлён");
        await loadPreCreatedUsers();
      } else if (editingUser) {
        // Это обычный пользователь
        const payload = {
          email: userForm.email || undefined,
          name: userForm.name || undefined,
          role: userForm.role,
          teamId: userForm.teamId || undefined,
          title: userForm.title || undefined,
          tabNumber: userForm.tabNumber || undefined,
          otpCode: userForm.otpCode || undefined,
          status: userForm.status,
          grade: userForm.grade !== "" ? (typeof userForm.grade === "number" ? userForm.grade : parseInt(userForm.grade as string, 10)) : undefined,
          hasPaid: userForm.hasPaid !== null ? userForm.hasPaid : undefined,
        };

        await api.updateAdminUser(editingUser.id, payload);
        toast.success("Пользователь обновлён");
        await loadAllUsers();
      } else {
        // Создание нового пользователя
        const payload = {
          email: userForm.email,
          name: userForm.name,
          role: userForm.role,
          teamId: userForm.teamId || undefined,
          title: userForm.title || undefined,
          tabNumber: userForm.tabNumber || undefined,
          otpCode: userForm.otpCode || undefined,
          status: userForm.status,
          grade: userForm.grade !== "" ? (typeof userForm.grade === "number" ? userForm.grade : parseInt(userForm.grade as string, 10)) : undefined,
          hasPaid: userForm.hasPaid !== null ? userForm.hasPaid : undefined,
        };

        await api.createAdminUser(payload);
        toast.success("Пользователь создан");
        await loadAllUsers();
      }

      setShowUserForm(false);
    } catch (error) {
      toast.error("Не удалось сохранить пользователя", {
        description:
          error instanceof Error ? error.message : "Ошибка сохранения",
      });
    }
  };

  const handleDeleteUser = async (userId: string, isPreCreated: boolean) => {
    if (!confirm("Вы уверены, что хотите удалить этого пользователя?")) return;

    try {
      if (isPreCreated) {
        await api.deletePreCreatedUser(userId);
        await loadPreCreatedUsers();
      } else {
        await api.deleteAdminUser(userId);
        await loadAllUsers();
      }
      toast.success("Пользователь удалён");
    } catch (error) {
      toast.error("Не удалось удалить пользователя", {
        description:
          error instanceof Error ? error.message : "Ошибка удаления",
      });
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await api.activatePreCreatedUser(userId);
      toast.success("Пользователь активирован");
      await loadPreCreatedUsers();
    } catch (error) {
      toast.error("Не удалось активировать пользователя", {
        description:
          error instanceof Error ? error.message : "Ошибка активации",
      });
    }
  };

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
        {
          id: "secret-santa" as const,
          label: "Тайный Санта",
          description: secretSantaState ? `Участников: ${secretSantaState.stats.total}` : "Управление активностью",
          badge: secretSantaState?.stats.total,
        },
        {
          id: "users" as const,
          label: "Пользователи",
          description: "Управление всеми пользователями",
          badge: allUsers.length,
        },
        {
          id: "feed" as const,
          label: "Лента",
          description: "Новости и канал связи",
          badge: feedComments.length + thoughts.length,
        },
      ] satisfies Array<{
        id: AdminTabId;
        label: string;
        description: string;
        badge?: number;
        disabled?: boolean;
      }>,
    [levels.length, submissions.length, pendingSubmissionCount, metrics, secretSantaState, allUsers.length, feedComments.length]
  );

  if (isLoading || !hasHydrated) {
    return (
      <ConsoleFrame className="flex h-[420px] items-center justify-center text-xs uppercase tracking-[0.24em] text-evm-muted">
        Загрузка панели администратора...
      </ConsoleFrame>
    );
  }

  // Проверка прав доступа
  if (hasHydrated && (!user || user.role !== "admin")) {
    return (
      <ConsoleFrame className="flex h-[420px] items-center justify-center text-xs uppercase tracking-[0.24em] text-evm-accent">
        Доступ запрещен. Требуются права администратора.
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
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {adminTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-md border border-evm-steel/30 bg-black/40 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evm-accent/50",
                tab.disabled && "cursor-not-allowed opacity-40",
                activeTab === tab.id
                  ? "border-evm-accent/60 bg-evm-accent/10 shadow-[0_0_20px_rgba(184,71,63,0.2)]"
                  : "hover:border-evm-accent/40 hover:bg-evm-accent/5"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] leading-tight">
                  {tab.label}
                </p>
                {typeof tab.badge === "number" ? (
                  <span className="rounded-md border border-evm-steel/40 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-evm-muted shrink-0">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-evm-muted leading-tight line-clamp-2">
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
                                                    {(() => {
                                                      try {
                                                        const photos = submission.payload.photos;
                                                        if (!photos) return null;

                                                        // Handle both array and non-array cases
                                                        const photosArray = Array.isArray(photos)
                                                          ? photos
                                                          : typeof photos === "string"
                                                            ? [photos]
                                                            : [];

                                                        if (photosArray.length === 0) return null;

                                                        // Filter out invalid photos
                                                        const validPhotos = photosArray
                                                          .filter((photo): photo is string => {
                                                            if (typeof photo !== "string" || !photo.trim()) {
                                                              console.warn("Invalid photo in submission:", { photo, submissionId: submission.id });
                                                              return false;
                                                            }
                                                            return true;
                                                          })
                                                          .slice(0, 2); // Show max 2 photos

                                                        if (validPhotos.length === 0) return null;

                                                        return (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-semibold text-evm-muted">
                                                              Фото ({photosArray.length}):
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-1">
                                                              {validPhotos.map((photo: string, index: number) => {
                                                                const photoUrl = resolvePhotoUrl(photo);
                                                                if (!photoUrl) {
                                                                  console.warn("🔴 [ADMIN LIST] Empty photo URL after resolution:", { photo, submissionId: submission.id });
                                                                  return null;
                                                                }
                                                                console.log("🔵 [ADMIN LIST] Rendering photo:", {
                                                                  index,
                                                                  photo,
                                                                  photoUrl,
                                                                  submissionId: submission.id,
                                                                });
                                                                return (
                                                                  <div key={`${submission.id}-photo-${index}`} className="relative">
                                                                    <img
                                                                      src={photoUrl}
                                                                      alt={`Photo ${index + 1}`}
                                                                      className="h-16 w-full rounded object-cover bg-black/20"
                                                                      loading="lazy"
                                                                      onError={(e) => {
                                                                        const img = e.target as HTMLImageElement;
                                                                        console.error("🔴 [ADMIN LIST] Failed to load image:", {
                                                                          photoUrl,
                                                                          photo,
                                                                          submissionId: submission.id,
                                                                          imgSrc: img.src,
                                                                          imgCurrentSrc: img.currentSrc,
                                                                          naturalWidth: img.naturalWidth,
                                                                          naturalHeight: img.naturalHeight,
                                                                          complete: img.complete,
                                                                        });
                                                                        // Don't hide the image - show error indicator instead
                                                                        img.style.opacity = "0.3";
                                                                        // Show error message
                                                                        const container = img.parentElement;
                                                                        if (container) {
                                                                          const existingError = container.querySelector(".image-error-indicator");
                                                                          if (existingError) {
                                                                            existingError.remove();
                                                                          }
                                                                          const errorDiv = document.createElement("div");
                                                                          errorDiv.className = "image-error-indicator absolute inset-0 flex items-center justify-center bg-red-500/20 rounded text-[8px] text-red-500";
                                                                          errorDiv.textContent = "Ошибка";
                                                                          container.appendChild(errorDiv);
                                                                        }
                                                                      }}
                                                                      onLoad={(e) => {
                                                                        const img = e.target as HTMLImageElement;
                                                                        console.log("🟢 [ADMIN LIST] Image loaded successfully:", {
                                                                          photoUrl,
                                                                          photo,
                                                                          submissionId: submission.id,
                                                                          imgSrc: img.src,
                                                                          naturalWidth: img.naturalWidth,
                                                                          naturalHeight: img.naturalHeight,
                                                                        });
                                                                        // Remove any error indicators on successful load
                                                                        const container = img.parentElement;
                                                                        if (container) {
                                                                          const errorIndicator = container.querySelector(".image-error-indicator");
                                                                          if (errorIndicator) {
                                                                            errorIndicator.remove();
                                                                          }
                                                                        }
                                                                      }}
                                                                    />
                                                                  </div>
                                                                );
                                                              })}
                                                            </div>
                                                          </div>
                                                        );
                                                      } catch (error) {
                                                        console.error("Error rendering photos:", { error, submissionId: submission.id, payload: submission.payload });
                                                        return (
                                                          <p className="text-xs text-red-500">
                                                            Ошибка отображения фотографий
                                                          </p>
                                                        );
                                                      }
                                                    })()}

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

        {activeTab === "secret-santa" && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Тайный Санта</CardTitle>
                <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
                  Управление активностью и участниками
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {secretSantaState ? (
                <>
                  {/* Statistics */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-md border border-evm-steel/40 bg-black/40 p-4">
                      <p className="text-2xl font-semibold">{secretSantaState.stats.total}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                        Всего участников
                      </p>
                    </div>
                    <div className="rounded-md border border-evm-steel/40 bg-black/40 p-4">
                      <p className="text-2xl font-semibold text-evm-matrix">
                        {secretSantaState.stats.matched}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                        Вытянули получателя
                      </p>
                    </div>
                    <div className="rounded-md border border-evm-steel/40 bg-black/40 p-4">
                      <p className="text-2xl font-semibold text-evm-accent">
                        {secretSantaState.stats.gifted}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-evm-muted">
                        Подарков отправлено
                      </p>
                    </div>
                  </div>

                  {/* Participants List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                        Участники ({secretSantaState.participants.length})
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void loadSecretSanta()}
                      >
                        Обновить
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {secretSantaState.participants
                        .sort((a, b) => {
                          // Sort by status: waiting first, then matched, then gifted
                          const statusOrder = { waiting: 0, matched: 1, gifted: 2 };
                          const statusDiff =
                            statusOrder[a.status] - statusOrder[b.status];
                          if (statusDiff !== 0) return statusDiff;
                          // Then by name
                          return a.name.localeCompare(b.name, "ru");
                        })
                        .map((participant) => {
                          const statusMeta = {
                            waiting: {
                              label: "В ожидании",
                              color: "border-yellow-500/50 bg-yellow-500/10",
                            },
                            matched: {
                              label: "Вытянул получателя",
                              color: "border-blue-500/50 bg-blue-500/10",
                            },
                            gifted: {
                              label: "Подарок отправлен",
                              color: "border-green-500/50 bg-green-500/10",
                            },
                          }[participant.status];

                          return (
                            <div
                              key={participant.id}
                              className={`rounded-md border ${statusMeta.color} p-4`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold uppercase tracking-[0.18em]">
                                    {participant.name}
                                  </p>
                                  <span className="rounded-md border border-evm-steel/40 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-evm-muted">
                                    {statusMeta.label}
                                  </span>
                                </div>
                                <p className="text-xs uppercase tracking-[0.16em] text-evm-muted">
                                  {participant.department}
                                </p>
                                {participant.matchedRecipient && (
                                  <div className="rounded border border-evm-accent/30 bg-evm-accent/5 p-2">
                                    <p className="text-[0.65rem] uppercase tracking-[0.16em] text-evm-muted mb-1">
                                      Дарит подарок:
                                    </p>
                                    <p className="text-xs font-semibold text-evm-accent">
                                      {participant.matchedRecipient.name}
                                    </p>
                                    <p className="text-[0.65rem] text-evm-muted mt-1">
                                      {participant.matchedRecipient.department}
                                    </p>
                                  </div>
                                )}
                                <div className="mt-2 rounded border border-evm-steel/20 bg-black/20 p-2">
                                  <p className="text-xs uppercase tracking-[0.18em] text-evm-muted mb-1">
                                    Пожелания:
                                  </p>
                                  <p className="text-xs text-foreground/90 leading-relaxed">
                                    {participant.wishlist}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Matching Information */}
                  {secretSantaState.stats.matched > 0 && (
                    <div className="rounded-md border border-evm-accent/30 bg-evm-accent/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-evm-muted mb-2">
                        Информация о жеребьевке
                      </p>
                      <p className="text-sm text-foreground/90">
                        {secretSantaState.stats.matched} из {secretSantaState.stats.total}{" "}
                        участников уже вытянули своих получателей.{" "}
                        {secretSantaState.stats.gifted > 0 &&
                          `${secretSantaState.stats.gifted} участников уже отметили подарок как отправленный.`}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                  Загрузка данных Тайного Санты...
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Все пользователи</CardTitle>
                  <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
                    Управление всеми пользователями системы
                  </p>
                </div>
                <Button onClick={handleCreateUser}>Создать пользователя</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {allUsers.length === 0 ? (
                  <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                    Пользователи не найдены. Создайте первого.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {allUsers.map((user) => {
                      const isPreCreated = user.status === "pending";
                      return (
                        <div
                          key={user.id}
                          className="rounded-md border border-evm-steel/40 bg-black/40 p-4"
                        >
                          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold uppercase tracking-[0.18em]">
                                  {user.name}
                                </p>
                                {isPreCreated && (
                                  <span className="rounded-md border border-yellow-500/50 bg-yellow-500/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-yellow-500">
                                    Предзаполнен
                                  </span>
                                )}
                                {!isPreCreated && (
                                  <span className="rounded-md border border-green-500/50 bg-green-500/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-green-500">
                                    Активен
                                  </span>
                                )}
                                <span className="rounded-md border border-evm-steel/40 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-evm-muted">
                                  {user.role}
                                </span>
                              </div>
                              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-evm-muted">
                                Email: {user.email}
                              </p>
                              <p className="text-xs uppercase tracking-[0.16em] text-evm-muted">
                                Табельный номер: {user.tabNumber}
                              </p>
                              <p className="text-xs uppercase tracking-[0.16em] text-evm-muted">
                                Код доступа: {user.otpCode}
                              </p>
                              {user.title && (
                                <p className="text-xs uppercase tracking-[0.16em] text-evm-muted">
                                  Должность: {user.title}
                                </p>
                              )}
                              {user.teamId && (
                                <p className="text-xs uppercase tracking-[0.16em] text-evm-muted">
                                  Команда: {user.teamId}
                                </p>
                              )}
                              {user.telegramId && (
                                <p className="text-xs uppercase tracking-[0.16em] text-evm-muted">
                                  Telegram ID: {user.telegramId}
                                </p>
                              )}
                              {user.grade !== undefined && user.grade !== null && (
                                <p className="text-xs uppercase tracking-[0.16em] text-evm-muted">
                                  Грейд: {user.grade}
                                </p>
                              )}
                              {user.hasPaid !== undefined && (
                                <p className="text-xs uppercase tracking-[0.16em] text-evm-muted">
                                  Оплата: {user.hasPaid ? "✅ Проведена" : "❌ Не проведена"}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              {isPreCreated && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleActivateUser(user.id)}
                                >
                                  Активировать
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                              >
                                Редактировать
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteUser(user.id, isPreCreated)}
                              >
                                Удалить
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "feed" && (
          <div className="space-y-4">
            {/* Thoughts Management */}
            <Card>
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Канал связи с операторами сети E.V.M.</CardTitle>
                  <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
                    Управление мыслями, отображаемыми в тикере на странице /feed
                  </p>
                </div>
                <Button onClick={handleCreateThought}>Добавить мысль</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {thoughts.length === 0 ? (
                  <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                    Мыслей пока нет. Создайте первую мысль.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {thoughts.map((thought) => (
                      <div
                        key={thought.id}
                        className="rounded-md border border-evm-steel/40 bg-black/40 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                              {thought.text}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-evm-muted">
                              {new Date(thought.createdAt).toLocaleString("ru-RU", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditThought(thought)}
                            >
                              Редактировать
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteThought(thought.id)}
                            >
                              Удалить
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feed News Management */}
            <Card>
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Новости в ленте</CardTitle>
                  <p className="text-xs uppercase tracking-[0.22em] text-evm-muted">
                    Управление новостями, отображаемыми в ленте на странице /feed
                  </p>
                </div>
                <Button onClick={() => setShowFeedForm(true)}>Добавить новость</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {feedComments.length === 0 ? (
                  <p className="text-xs uppercase tracking-[0.2em] text-evm-muted">
                    Новостей пока нет. Создайте первую новость.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {feedComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-md border border-evm-steel/40 bg-black/40 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                              {comment.body}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-evm-muted">
                              {new Date(comment.createdAt).toLocaleString("ru-RU", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

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
                  {(() => {
                    try {
                      console.log("🔵 [ADMIN DETAIL] Rendering photos for submission:", {
                        submissionId: selectedSubmission.id,
                        payload: selectedSubmission.payload,
                        payloadStringified: JSON.stringify(selectedSubmission.payload),
                        photos: selectedSubmission.payload.photos,
                        photosType: typeof selectedSubmission.payload.photos,
                        isArray: Array.isArray(selectedSubmission.payload.photos),
                        payloadKeys: Object.keys(selectedSubmission.payload || {}),
                      });

                      const photos = selectedSubmission.payload.photos;
                      if (!photos) {
                        console.log("🔵 [ADMIN DETAIL] No photos in payload");
                        return null;
                      }

                      // Handle both array and non-array cases
                      const photosArray = Array.isArray(photos)
                        ? photos
                        : typeof photos === "string"
                          ? [photos]
                          : [];

                      console.log("🔵 [ADMIN DETAIL] Photos array:", {
                        length: photosArray.length,
                        photos: photosArray,
                      });

                      if (photosArray.length === 0) {
                        console.log("🔵 [ADMIN DETAIL] Photos array is empty");
                        return null;
                      }

                      // Filter out invalid photos
                      const validPhotos = photosArray
                        .filter((photo): photo is string => {
                          if (typeof photo !== "string" || !photo.trim()) {
                            console.warn("🔴 [ADMIN DETAIL] Invalid photo:", { photo, submissionId: selectedSubmission.id });
                            return false;
                          }
                          return true;
                        });

                      console.log("🔵 [ADMIN DETAIL] Valid photos:", {
                        count: validPhotos.length,
                        photos: validPhotos,
                      });

                      if (validPhotos.length === 0) {
                        console.log("🔴 [ADMIN DETAIL] No valid photos after filtering");
                        return (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-evm-muted">
                              Загруженные фото:
                            </p>
                            <p className="text-xs text-red-500">
                              Фотографии не найдены или имеют неверный формат
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-evm-muted">
                            Загруженные фото ({validPhotos.length}):
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {validPhotos.map((photo: string, index: number) => {
                              const photoUrl = resolvePhotoUrl(photo);
                              console.log("🔵 [ADMIN DETAIL] Rendering photo:", {
                                index,
                                photo,
                                photoUrl,
                                submissionId: selectedSubmission.id,
                              });

                              if (!photoUrl) {
                                console.warn("🔴 [ADMIN DETAIL] Empty photo URL after resolution:", { photo, submissionId: selectedSubmission.id });
                                return (
                                  <div key={`${selectedSubmission.id}-photo-${index}`} className="h-32 w-full rounded-md border border-red-500/50 bg-red-500/10 flex items-center justify-center">
                                    <p className="text-xs text-red-500">Ошибка загрузки</p>
                                  </div>
                                );
                              }

                              return (
                                <div key={`${selectedSubmission.id}-photo-${index}`} className="relative group">
                                  <div className="h-32 w-full rounded-md border border-evm-steel/20 bg-black/20 overflow-hidden relative">
                                    {/* Test if image loads */}
                                    <img
                                      src={photoUrl}
                                      alt={`Photo ${index + 1}`}
                                      className="h-full w-full object-cover"
                                      loading="eager"
                                      onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        console.error("🔴 [ADMIN DETAIL] Failed to load image:", {
                                          photoUrl,
                                          photo,
                                          originalPhoto: photo,
                                          submissionId: selectedSubmission.id,
                                          imgSrc: img.src,
                                          imgCurrentSrc: img.currentSrc,
                                          naturalWidth: img.naturalWidth,
                                          naturalHeight: img.naturalHeight,
                                          complete: img.complete,
                                        });
                                        // Don't hide the image - show error overlay instead
                                        img.style.opacity = "0.3";
                                        // Show error message
                                        const container = img.parentElement;
                                        if (container) {
                                          // Remove existing error div if any
                                          const existingError = container.querySelector(".image-error-overlay");
                                          if (existingError) {
                                            existingError.remove();
                                          }
                                          const errorDiv = document.createElement("div");
                                          errorDiv.className = "image-error-overlay absolute inset-0 flex flex-col items-center justify-center p-2 bg-red-500/20 border border-red-500/50 rounded-md z-10";
                                          errorDiv.innerHTML = `
                                            <p class="text-xs text-red-500 font-semibold mb-1">Ошибка загрузки</p>
                                            <a href="${photoUrl}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-blue-400 hover:underline break-all text-center max-w-full" title="${photoUrl}">
                                              Открыть в новой вкладке
                                            </a>
                                          `;
                                          container.appendChild(errorDiv);
                                        }
                                      }}
                                      onLoad={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        console.log("🟢 [ADMIN DETAIL] Image loaded successfully:", {
                                          photoUrl,
                                          photo,
                                          imgSrc: img.src,
                                          imgCurrentSrc: img.currentSrc,
                                          naturalWidth: img.naturalWidth,
                                          naturalHeight: img.naturalHeight,
                                          complete: img.complete,
                                        });
                                        // Remove any error overlays on successful load
                                        const container = img.parentElement;
                                        if (container) {
                                          const errorOverlay = container.querySelector(".image-error-overlay");
                                          if (errorOverlay) {
                                            errorOverlay.remove();
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                  {/* Show URL on hover for debugging */}
                                  <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center p-2 pointer-events-none z-20">
                                    <p className="text-[10px] text-white break-all text-center max-w-full">{photoUrl}</p>
                                  </div>
                                  {/* Open button */}
                                  <a
                                    href={photoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute bottom-1 right-1 rounded bg-black/70 px-2 py-1 text-xs text-white hover:bg-black/90 z-30"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Открыть
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } catch (error) {
                      console.error("🔴 [ADMIN DETAIL] Error rendering photos:", {
                        error,
                        submissionId: selectedSubmission.id,
                        payload: selectedSubmission.payload
                      });
                      return (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-evm-muted">
                            Загруженные фото:
                          </p>
                          <p className="text-xs text-red-500">
                            Ошибка отображения фотографий: {error instanceof Error ? error.message : "Неизвестная ошибка"}
                          </p>
                        </div>
                      );
                    }
                  })()}

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

      {/* User Form Modal */}
      {showUserForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUserForm(false);
            }
          }}
        >
          <Card
            className="w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex-shrink-0">
              <CardTitle>
                {editingUser ? "Редактировать пользователя" : "Создать пользователя"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <Label htmlFor="userEmail">Email {!editingUser || (editingUser && "status" in editingUser && editingUser.status !== "pending") ? "" : "(опционально)"}</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  placeholder={!editingUser || (editingUser && "status" in editingUser && editingUser.status !== "pending") ? "Email пользователя" : "Будет сгенерирован автоматически, если не указан"}
                  required={!editingUser || (editingUser && "status" in editingUser && editingUser.status !== "pending")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userName">Имя {!editingUser || (editingUser && "status" in editingUser && editingUser.status !== "pending") ? "" : "(опционально)"}</Label>
                <Input
                  id="userName"
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                  placeholder={!editingUser || (editingUser && "status" in editingUser && editingUser.status !== "pending") ? "Имя пользователя" : "Будет сгенерирован тематический ник, если не указан"}
                  required={!editingUser || (editingUser && "status" in editingUser && editingUser.status !== "pending")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userRole">Роль</Label>
                <select
                  id="userRole"
                  className="flex h-11 w-full rounded-md border border-white/10 bg-black/40 px-4 text-sm uppercase tracking-[0.18em] text-foreground"
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      role: e.target.value as "user" | "mod" | "admin",
                    })
                  }
                >
                  <option value="user">Пользователь</option>
                  <option value="mod">Модератор</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userTeamId">ID команды (опционально)</Label>
                <Input
                  id="userTeamId"
                  value={userForm.teamId}
                  onChange={(e) =>
                    setUserForm({ ...userForm, teamId: e.target.value })
                  }
                  placeholder="ID команды"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userTitle">Должность (опционально)</Label>
                <Input
                  id="userTitle"
                  value={userForm.title}
                  onChange={(e) =>
                    setUserForm({ ...userForm, title: e.target.value })
                  }
                  placeholder="Должность пользователя"
                />
              </div>
              {(!editingUser || (editingUser && "status" in editingUser && editingUser.status !== "pending")) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="userTabNumber">Табельный номер (опционально)</Label>
                    <Input
                      id="userTabNumber"
                      value={userForm.tabNumber}
                      onChange={(e) =>
                        setUserForm({ ...userForm, tabNumber: e.target.value })
                      }
                      placeholder="Будет сгенерирован автоматически, если не указан"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userOtpCode">Код доступа (опционально)</Label>
                    <Input
                      id="userOtpCode"
                      value={userForm.otpCode}
                      onChange={(e) =>
                        setUserForm({ ...userForm, otpCode: e.target.value })
                      }
                      placeholder="Будет сгенерирован автоматически, если не указан"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userStatus">Статус</Label>
                    <select
                      id="userStatus"
                      className="flex h-11 w-full rounded-md border border-white/10 bg-black/40 px-4 text-sm uppercase tracking-[0.18em] text-foreground"
                      value={userForm.status}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          status: e.target.value as "active" | "pending",
                        })
                      }
                    >
                      <option value="active">Активен</option>
                      <option value="pending">Предзаполнен</option>
                    </select>
                  </div>
                </>
              )}
              {(!editingUser || (editingUser && "status" in editingUser && editingUser.status !== "pending")) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="userGrade">Грейд (опционально)</Label>
                    <Input
                      id="userGrade"
                      type="number"
                      min="8"
                      max="13"
                      value={userForm.grade}
                      onChange={(e) =>
                        setUserForm({ ...userForm, grade: e.target.value === "" ? "" : parseInt(e.target.value, 10) })
                      }
                      placeholder="8-13"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userHasPaid">Оплата проведена</Label>
                    <select
                      id="userHasPaid"
                      className="flex h-11 w-full rounded-md border border-white/10 bg-black/40 px-4 text-sm uppercase tracking-[0.18em] text-foreground"
                      value={userForm.hasPaid === null ? "" : userForm.hasPaid ? "true" : "false"}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          hasPaid: e.target.value === "" ? null : e.target.value === "true",
                        })
                      }
                    >
                      <option value="">Не указано</option>
                      <option value="true">Да</option>
                      <option value="false">Нет</option>
                    </select>
                  </div>
                </>
              )}
              <div className="rounded-md border border-evm-accent/30 bg-evm-accent/5 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-evm-muted mb-1">
                  Информация
                </p>
                <p className="text-xs text-foreground/90">
                  {!editingUser || (editingUser && "status" in editingUser && editingUser.status !== "pending")
                    ? "Для обычных пользователей email и имя обязательны. Табельный номер и код доступа будут сгенерированы автоматически, если не указаны."
                    : "Если email и имя не указаны, они будут автоматически сгенерированы. Табельный номер и код доступа генерируются автоматически для всех пользователей."}
                </p>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t border-evm-steel/20 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => setShowUserForm(false)}
              >
                Отмена
              </Button>
              <Button onClick={handleSaveUser}>Сохранить</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Feed News Form Modal */}
      {showFeedForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFeedForm(false);
            }
          }}
        >
          <Card
            className="w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex-shrink-0">
              <CardTitle>Добавить новость</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <Label htmlFor="feedBody">Текст новости</Label>
                <Textarea
                  id="feedBody"
                  value={feedForm.body}
                  onChange={(e) =>
                    setFeedForm({ ...feedForm, body: e.target.value })
                  }
                  placeholder="Введите текст новости, которая будет отображаться в ленте..."
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs uppercase tracking-[0.16em] text-evm-muted">
                  Новость будет отображена в ленте на странице /feed
                </p>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t border-evm-steel/20 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowFeedForm(false);
                  setFeedForm({ body: "" });
                }}
              >
                Отмена
              </Button>
              <Button onClick={handleCreateFeedNews}>Опубликовать</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Thought Form Modal */}
      {showThoughtForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowThoughtForm(false);
            }
          }}
        >
          <Card
            className="w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex-shrink-0">
              <CardTitle>
                {editingThought ? "Редактировать мысль" : "Добавить мысль"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <Label htmlFor="thoughtText">Текст мысли</Label>
                <Textarea
                  id="thoughtText"
                  value={thoughtForm.text}
                  onChange={(e) =>
                    setThoughtForm({ ...thoughtForm, text: e.target.value })
                  }
                  placeholder="Введите текст мысли, которая будет отображаться в тикере 'Канал связи с операторами сети E.V.M.'..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs uppercase tracking-[0.16em] text-evm-muted">
                  Мысль будет отображена в тикере на странице /feed
                </p>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t border-evm-steel/20 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowThoughtForm(false);
                  setThoughtForm({ text: "" });
                  setEditingThought(null);
                }}
              >
                Отмена
              </Button>
              <Button onClick={handleSaveThought}>
                {editingThought ? "Сохранить" : "Добавить"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
