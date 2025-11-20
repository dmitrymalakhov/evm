import { create } from "zustand";

import { api } from "@/services/api";
import type { Level, SubmissionResponse, Task } from "@/types/contracts";

type LevelState = {
  currentLevel: Level | null;
  tasks: Task[];
  isLoading: boolean;
  submissions: Record<string, SubmissionResponse>;
  unlockedKeys: string[];
  error: string | null;
  loadLevel: (options?: { week?: number; teamId?: string }) => Promise<void>;
  submitTask: (
    taskId: string,
    payload: Record<string, unknown>,
  ) => Promise<SubmissionResponse>;
  reset: () => void;
};

export const useLevelStore = create<LevelState>((set) => ({
  currentLevel: null,
  tasks: [],
  isLoading: false,
  submissions: {},
  unlockedKeys: [],
  error: null,
  async loadLevel(options) {
    const week = options?.week;
    const teamId = options?.teamId;
    set({ isLoading: true, error: null });
    try {
      const level = week
        ? await api.getLevelByWeek(week)
        : await api.getCurrentLevel();
      
      console.log("[LevelStore] Loaded level:", level ? {
        id: level.id,
        week: level.week,
        title: level.title,
      } : null);
      
      if (!level) {
        console.warn("[LevelStore] Level is null or undefined");
        set({
          error: "Активный уровень не найден",
          isLoading: false,
          currentLevel: null,
          tasks: [],
        });
        return;
      }

      const tasks = await api.getTasksForLevel(level.id);
      let unlockedKeys: string[] = [];
      if (teamId) {
        const progress = await api.getTeamProgress(teamId);
        unlockedKeys = progress.unlockedKeys ?? [];
      }

      // Load submissions for tasks
      const taskIds = tasks.map((t) => t.id);
      let submissions: Record<string, SubmissionResponse> = {};
      try {
        const submissionList = await api.getTaskSubmissions(taskIds);
        submissionList.forEach((sub) => {
          submissions[sub.taskId] = {
            status: sub.status as "accepted" | "rejected" | "pending" | "revision",
            hint: sub.hint ?? undefined,
            message: sub.message ?? undefined,
          };
        });
      } catch {
        // Ignore submission loading errors
      }

      set({
        currentLevel: level,
        tasks,
        unlockedKeys,
        submissions,
        isLoading: false,
      });
    } catch (error) {
      console.error("[LevelStore] Error loading level:", error);
      set({
        error:
          error instanceof Error ? error.message : "Не удалось загрузить уровень",
        isLoading: false,
        currentLevel: null,
        tasks: [],
      });
    }
  },
  async submitTask(taskId, payload) {
    const response = await api.submitTask(taskId, payload);
    set((state) => ({
      submissions: { ...state.submissions, [taskId]: response },
      unlockedKeys: state.unlockedKeys.includes(taskId)
        ? state.unlockedKeys
        : [...state.unlockedKeys, taskId],
    }));
    return response;
  },
  reset: () => {
    set({
      currentLevel: null,
      tasks: [],
      submissions: {},
      unlockedKeys: [],
      error: null,
      isLoading: false,
    });
  },
}));

