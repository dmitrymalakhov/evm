import { create } from "zustand";

import { api } from "@/services/api";
import type { User } from "@/types/contracts";

type FeatureFlags = {
  realtime: boolean;
  payments: boolean;
  admin: boolean;
};

type SessionState = {
  user: User | null;
  isLoading: boolean;
  hasHydrated: boolean;
  featureFlags: FeatureFlags;
  error: string | null;
  login: (tabNumber: string, otp: string) => Promise<void>;
  loadProfile: () => Promise<void>;
  logout: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  isLoading: false,
  hasHydrated: false,
  featureFlags: {
    realtime: true,
    payments: false,
    admin: true,
  },
  error: null,
  async login(tabNumber, otp) {
    set({ isLoading: true, error: null });
    try {
      await api.login({ tabNumber, otp });
      const [user, features] = await Promise.all([
        api.getMe(),
        api.getFeatures(),
      ]);
      set({
        user,
        hasHydrated: true,
        featureFlags: features,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Ошибка входа",
        isLoading: false,
      });
      throw error;
    }
  },
  async loadProfile() {
    set({ isLoading: true });
    try {
      const [user, features] = await Promise.all([
        api.getMe(),
        api.getFeatures(),
      ]);
      set({
        user,
        featureFlags: features,
        hasHydrated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Ошибка загрузки профиля",
        isLoading: false,
      });
    }
  },
  logout() {
    set({
      user: null,
      hasHydrated: false,
    });
  },
}));

