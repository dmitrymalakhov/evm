import {
  type AdminMetrics,
  type Comment,
  type Idea,
  type Level,
  type SubmissionResponse,
  type Task,
  type Team,
  type Thought,
  type ThoughtFeed,
  type Ticket,
  type User,
  type ValidatorResponse,
} from "@/types/contracts";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

function resolveUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return input;
    }
    return `${API_BASE_URL}${input.startsWith("/") ? "" : "/"}${input}`;
  }
  return input;
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveUrl(input), {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...init?.headers },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }

  if (response.status === 204) {
    return null as T;
  }

  const data = (await response.json()) as T;
  return data;
}

export const api = {
  login: (payload: { tabNumber: string; otp: string }) =>
    request<{ access_token: string; refresh_token: string; expires_in: number }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  getFeatures: () =>
    request<{ realtime: boolean; payments: boolean; admin: boolean }>(
      "/features",
    ),

  getMe: () => request<User>("/me"),

  getCurrentLevel: () => request<Level>("/levels/current"),

  getLevelByWeek: (week: number) => request<Level>(`/levels/week/${week}`),

  getTasksForLevel: (levelId: string) =>
    request<Task[]>(`/levels/${levelId}/tasks`),

  submitTask: (taskId: string, body: Record<string, unknown>) =>
    request<SubmissionResponse>(`/tasks/${taskId}/submit`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

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

  getTeamProgress: (teamId: string) =>
    request<{ progress: number; completedTasks: string[]; unlockedKeys: string[] }>(
      `/teams/${teamId}/progress`,
    ),

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

  validatePass: (code: string) =>
    request<ValidatorResponse>("/validator/check", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
};

