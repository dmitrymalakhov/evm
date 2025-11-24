import {
  type AdminMetrics,
  type Comment,
  type Idea,
  type Iteration,
  type Level,
  type Role,
  type SecretSantaState,
  type SecretSantaAdminState,
  type SubmissionResponse,
  type Task,
  type TaskCompletionByWeek,
  type TaskCompletionStat,
  type Team,
  type TeamProgressSummary,
  type Thought,
  type ThoughtFeed,
  type Ticket,
  type TopUserStat,
  type User,
  type UserActivityTimeline,
  type UserProgressStat,
  type ValidatorResponse,
  type WeeklyActivityStat,
} from "@/types/contracts";

const isBrowser = typeof window !== "undefined";
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};
const TOKEN_STORAGE_KEY = "evm.auth";

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

let authTokens: StoredTokens | null = null;
let tokensRestored = !isBrowser;

function storeTokens(tokens: StoredTokens | null) {
  authTokens = tokens;
  tokensRestored = true;
  if (!isBrowser) return;
  try {
    if (tokens) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors (e.g. private mode)
  }
}

function restoreTokensFromStorage() {
  if (tokensRestored) return authTokens;
  tokensRestored = true;
  if (!isBrowser) return authTokens;

  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) {
      storeTokens(null);
      return authTokens;
    }
    const parsed = JSON.parse(raw) as Partial<StoredTokens>;
    if (
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string" &&
      typeof parsed.expiresAt === "number"
    ) {
      storeTokens({
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expiresAt: parsed.expiresAt,
      });
      return authTokens;
    }
  } catch {
    // Fall through to clear tokens
  }

  storeTokens(null);
  return authTokens;
}

function getAccessToken() {
  const tokens = restoreTokensFromStorage();
  if (!tokens) return null;
  if (tokens.expiresAt <= Date.now()) {
    storeTokens(null);
    return null;
  }
  return tokens.accessToken;
}

function setAuthTokens(payload: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  const expiresAt = Date.now() + Math.max(payload.expiresIn - 30, 0) * 1000;
  storeTokens({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresAt,
  });
}

function clearAuthTokens() {
  storeTokens(null);
}

function resolveUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return input;
    }
    return `${API_BASE_URL}${input.startsWith("/") ? "" : "/"}${input}`;
  }
  return input;
}

function createHeaders(init?: HeadersInit) {
  const headers = new Headers(DEFAULT_HEADERS);

  if (init instanceof Headers) {
    init.forEach((value, key) => headers.set(key, value));
  } else if (Array.isArray(init)) {
    init.forEach(([key, value]) => headers.set(key, value));
  } else if (init) {
    Object.entries(init).forEach(([key, value]) => {
      if (typeof value === "undefined") return;
      headers.set(key, value as string);
    });
  }

  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function parseErrorMessage(response: Response) {
  // Клонируем response, чтобы можно было прочитать body несколько раз
  const clonedResponse = response.clone();
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    try {
      const data = await response.json();
      if (data && typeof data === "object" && "message" in data) {
        const message = data.message;
        if (typeof message === "string") {
          return message;
        }
      }
      return JSON.stringify(data);
    } catch {
      // Если не удалось распарсить JSON, пробуем прочитать как текст из клона
      try {
        const text = await clonedResponse.text();
        if (text) return text;
      } catch {
        // ignore text parse errors
      }
    }
  } else {
    try {
      const text = await response.text();
      if (text) return text;
    } catch {
      // ignore text parse errors
    }
  }
  return response.statusText;
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveUrl(input), {
    ...init,
    headers: createHeaders(init?.headers),
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthTokens();
    }
    const message = await parseErrorMessage(response);
    throw new ApiError(message || response.statusText, response.status);
  }

  if (response.status === 204) {
    return null as T;
  }

  const data = (await response.json()) as T;
  return data;
}

export const api = {
  login: async (payload: { tabNumber: string; otp: string }) => {
    const result = await request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setAuthTokens({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
    });

    return result;
  },
  logout: () => {
    clearAuthTokens();
  },

  getFeatures: () =>
    request<{ realtime: boolean; payments: boolean; admin: boolean }>(
      "/features",
    ),

  getMe: () => request<User>("/me"),

  getCurrentLevel: () => request<Level>("/levels/current"),

  getLevelByWeek: (week: number) => request<Level>(`/levels/week/${week}`),

  getTasksForLevel: (levelId: string) =>
    request<Task[]>(`/levels/${levelId}/tasks`),

  getTaskSubmissions: (taskIds?: string[]) =>
    request<
      Array<{
        taskId: string;
        status: string;
        hint: string | null;
        message: string | null;
        createdAt: string;
      }>
    >(
      `/tasks/submissions${taskIds && taskIds.length > 0 ? `?taskIds=${taskIds.join(",")}` : ""}`,
    ),

  submitTask: (taskId: string, body: Record<string, unknown>) =>
    request<SubmissionResponse>(`/tasks/${taskId}/submit`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  uploadFiles: async (files: File[]): Promise<Array<{ filename: string; url: string; originalName: string; size: number; mimetype: string }>> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("photos", file);
    });

    const token = getAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // Don't set Content-Type - browser will set it automatically with boundary for FormData

    const response = await fetch(resolveUrl("/uploads"), {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new ApiError(message || response.statusText, response.status);
    }

    const data = await response.json();
    // Convert relative URLs to absolute URLs
    return data.files.map((file: { filename: string; url: string; originalName: string; size: number; mimetype: string }) => ({
      ...file,
      url: resolveUrl(file.url),
    }));
  },

  getFeed: () => request<ThoughtFeed>("/feed"),

  postThought: (text: string) =>
    request<Thought>("/thoughts/anon", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  postComment: (
    payload: Pick<Comment, "entityId" | "entityType" | "body"> & {
      parentId?: string;
    },
  ) =>
    request<Comment>("/comments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getTicket: () => request<Ticket>("/tickets/me"),

  getTeam: (teamId: string) => request<Team>(`/teams/${teamId}`),

  getTeamChat: (teamId: string) =>
    request(
      `/teams/${teamId}/chat`,
    ) as Promise<Array<{
      id: string;
      teamId: string;
      userId: string;
      userName: string;
      body: string;
      createdAt: string;
    }>>,

  postTeamChatMessage: (teamId: string, body: string) =>
    request(`/teams/${teamId}/chat`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  getTeamIdeas: (teamId: string) =>
    request<Idea[]>(`/teams/${teamId}/ideas`),

  createTeamIdea: (teamId: string, idea: Pick<Idea, "title" | "description">) =>
    request<Idea>(`/teams/${teamId}/ideas`, {
      method: "POST",
      body: JSON.stringify(idea),
    }),

  updateTeamIdea: (teamId: string, ideaId: string, updates: Partial<Idea>) =>
    request<Idea>(`/teams/${teamId}/ideas/${ideaId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  voteForTeamIdea: (teamId: string, ideaId: string) =>
    request<Idea>(`/teams/${teamId}/ideas/${ideaId}/vote`, {
      method: "POST",
    }),

  removeTeamIdeaVote: (teamId: string, ideaId: string) =>
    request<Idea>(`/teams/${teamId}/ideas/${ideaId}/vote`, {
      method: "DELETE",
    }),

  getTeamProgress: (teamId: string) =>
    request<TeamProgressSummary>(`/teams/${teamId}/progress`),

  getSecretSantaState: () => request<SecretSantaState>("/secret-santa"),

  getSecretSantaAdminState: () =>
    request<SecretSantaAdminState>("/secret-santa/admin"),

  registerSecretSanta: (payload: { wishlist: string; reminderNote?: string | null }) =>
    request<SecretSantaState>("/secret-santa/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  drawSecretSanta: () =>
    request<SecretSantaState>("/secret-santa/draw", {
      method: "POST",
    }),

  markSecretSantaGifted: () =>
    request<SecretSantaState>("/secret-santa/gift", {
      method: "POST",
    }),

  updateSecretSantaReminder: (reminderNote: string) =>
    request<SecretSantaState>("/secret-santa/reminder", {
      method: "POST",
      body: JSON.stringify({ reminderNote }),
    }),

  drawAllSecretSanta: () =>
    request<SecretSantaState>("/secret-santa/admin/draw-all", {
      method: "POST",
    }),

  getAdminLevels: () => request<Level[]>("/admin/levels"),

  createAdminLevel: (payload: Level) =>
    request<Level>("/admin/levels", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateAdminLevel: (id: string, payload: Partial<Level>) =>
    request<Level>(`/admin/levels/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getAdminComments: () => request<Comment[]>("/admin/moderation/comments"),

  hideAdminComment: (commentId: string) =>
    request<Comment>(`/admin/moderation/comments/${commentId}/hide`, {
      method: "POST",
    }),

  getAdminMetrics: () => request<AdminMetrics>("/admin/metrics"),

  getAdminIterations: () => request<Iteration[]>("/admin/iterations"),

  setAdminIterationWeek: (iterationId: string, currentWeek: number) =>
    request<Iteration>(`/admin/iterations/${iterationId}/current-week`, {
      method: "POST",
      body: JSON.stringify({ currentWeek }),
    }),

  getAdminTasks: (levelId: string) =>
    request<Task[]>(`/admin/levels/${levelId}/tasks`),

  createAdminTask: (
    levelId: string,
    payload: Omit<Task, "id" | "levelId"> & { id?: string },
  ) =>
    request<Task>(`/admin/levels/${levelId}/tasks`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateAdminTask: (
    taskId: string,
    payload: Partial<Omit<Task, "id">> & { levelId?: string },
  ) =>
    request<Task>(`/admin/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteAdminTask: (taskId: string) =>
    request<null>(`/admin/tasks/${taskId}`, {
      method: "DELETE",
    }),

  getAdminSubmissions: () =>
    request<
      Array<{
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
      }>
    >("/admin/moderation/submissions"),

  getAdminSubmission: (submissionId: string) =>
    request<{
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
    }>(`/admin/moderation/submissions/${submissionId}`),

  updateAdminSubmission: (
    submissionId: string,
    payload: {
      status?: "accepted" | "rejected" | "pending" | "revision";
      hint?: string | null;
      message?: string | null;
    },
  ) =>
    request<{
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
    }>(`/admin/moderation/submissions/${submissionId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  validatePass: (code: string) =>
    request<ValidatorResponse>("/validator/check", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  // Analytics endpoints
  getTaskCompletionStats: (taskId?: string) =>
    request<TaskCompletionStat[]>(
      `/analytics/task-completion${taskId ? `?taskId=${taskId}` : ""}`,
    ),

  getUserProgressStats: (userId?: string) =>
    request<UserProgressStat[]>(
      `/analytics/user-progress${userId ? `?userId=${userId}` : ""}`,
    ),

  getWeeklyActivityStats: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request<WeeklyActivityStat[]>(
      `/analytics/weekly-activity${params.toString() ? `?${params.toString()}` : ""}`,
    );
  },

  getTopUsersByActivity: (limit = 10) =>
    request<TopUserStat[]>(`/analytics/top-users?limit=${limit}`),

  getTaskCompletionByWeek: () =>
    request<TaskCompletionByWeek[]>("/analytics/task-completion-by-week"),

  getUserActivityTimeline: (userId: string, days = 30) =>
    request<UserActivityTimeline[]>(
      `/analytics/user-timeline/${userId}?days=${days}`,
    ),

  // Pre-created users endpoints
  getPreCreatedUsers: () =>
    request<
      Array<{
        id: string;
        email: string;
        name: string;
        role: Role;
        teamId?: string;
        title?: string;
        tabNumber: string;
        otpCode: string;
        status: "active" | "pending";
        createdAt: string;
        updatedAt: string;
      }>
    >("/admin/users/pre-created"),

  createPreCreatedUser: (payload: {
    email?: string;
    name?: string;
    role?: Role;
    teamId?: string;
    title?: string;
  }) =>
    request<{
      id: string;
      email: string;
      name: string;
      role: Role;
      teamId?: string;
      title?: string;
      tabNumber: string;
      otpCode: string;
      status: "active" | "pending";
      createdAt: string;
      updatedAt: string;
    }>("/admin/users/pre-created", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updatePreCreatedUser: (
    userId: string,
    payload: {
      email?: string;
      name?: string;
      role?: Role;
      teamId?: string;
      title?: string;
    },
  ) =>
    request<{
      id: string;
      email: string;
      name: string;
      role: Role;
      teamId?: string;
      title?: string;
      tabNumber: string;
      otpCode: string;
      status: "active" | "pending";
      createdAt: string;
      updatedAt: string;
    }>(`/admin/users/pre-created/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deletePreCreatedUser: (userId: string) =>
    request<null>(`/admin/users/pre-created/${userId}`, {
      method: "DELETE",
    }),

  activatePreCreatedUser: (userId: string) =>
    request<{
      id: string;
      email: string;
      name: string;
      role: Role;
      teamId?: string;
      title?: string;
      tabNumber: string;
      otpCode: string;
      status: "active" | "pending";
      createdAt: string;
      updatedAt: string;
    }>(`/admin/users/pre-created/${userId}/activate`, {
      method: "POST",
    }),

  // Управление пользователями
  getAdminUsers: () =>
    request<
      Array<{
        id: string;
        email: string;
        name: string;
        role: Role;
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
      }>
    >("/admin/users"),

  getAdminUser: (userId: string) =>
    request<{
      id: string;
      email: string;
      name: string;
      role: Role;
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
    }>(`/admin/users/${userId}`),

  createAdminUser: (payload: {
    email: string;
    name: string;
    role: Role;
    teamId?: string;
    title?: string;
    tabNumber?: string;
    otpCode?: string;
    status?: "active" | "pending";
    grade?: number;
    hasPaid?: boolean;
  }) =>
    request<{
      id: string;
      email: string;
      name: string;
      role: Role;
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
    }>("/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateAdminUser: (
    userId: string,
    payload: {
      email?: string;
      name?: string;
      role?: Role;
      teamId?: string;
      title?: string;
      tabNumber?: string;
      otpCode?: string;
      status?: "active" | "pending";
      grade?: number;
      hasPaid?: boolean;
    },
  ) =>
    request<{
      id: string;
      email: string;
      name: string;
      role: Role;
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
    }>(`/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteAdminUser: (userId: string) =>
    request<null>(`/admin/users/${userId}`, {
      method: "DELETE",
    }),

  // Thoughts management
  getAdminThoughts: () => request<Thought[]>("/admin/thoughts"),

  createAdminThought: (text: string) =>
    request<Thought>("/admin/thoughts", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  updateAdminThought: (thoughtId: string, text: string) =>
    request<Thought>(`/admin/thoughts/${thoughtId}`, {
      method: "PUT",
      body: JSON.stringify({ text }),
    }),

  deleteAdminThought: (thoughtId: string) =>
    request<null>(`/admin/thoughts/${thoughtId}`, {
      method: "DELETE",
    }),
};

export const authSession = {
  clear: clearAuthTokens,
  hasValidAccessToken: () => Boolean(getAccessToken()),
};

