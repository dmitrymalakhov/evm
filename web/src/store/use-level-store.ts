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
      const tasks = await api.getTasksForLevel(level.id);
      let unlockedKeys: string[] = [];
      if (teamId) {
        const progress = await api.getTeamProgress(teamId);
        unlockedKeys = progress.unlockedKeys ?? [];
      }
      set({
        currentLevel: level,
        tasks,
        unlockedKeys,
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Не удалось загрузить уровень",
        isLoading: false,
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
}));

