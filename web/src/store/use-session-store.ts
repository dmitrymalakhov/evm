import { create } from "zustand";

import { ApiError, api, authSession } from "@/services/api";
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

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  realtime: true,
  payments: false,
  admin: true,
};

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  isLoading: false,
  hasHydrated: false,
  featureFlags: DEFAULT_FEATURE_FLAGS,
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
      if (error instanceof ApiError && error.status === 401) {
        authSession.clear();
      }
      set({
        error: error instanceof Error ? error.message : "Ошибка входа",
        isLoading: false,
      });
      throw error;
    }
  },
  async loadProfile() {
    set({ isLoading: true, error: null });
    try {
      if (!authSession.hasValidAccessToken()) {
        set({
          user: null,
          featureFlags: DEFAULT_FEATURE_FLAGS,
          hasHydrated: true,
          isLoading: false,
        });
        return;
      }
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
      if (error instanceof ApiError && error.status === 401) {
        authSession.clear();
        set({
          user: null,
          featureFlags: DEFAULT_FEATURE_FLAGS,
          hasHydrated: true,
          isLoading: false,
          error: null,
        });
        return;
      }
      set({
        error: error instanceof Error ? error.message : "Ошибка загрузки профиля",
        isLoading: false,
      });
    }
  },
  logout() {
    api.logout();
    set({
      user: null,
      featureFlags: DEFAULT_FEATURE_FLAGS,
      hasHydrated: false,
      isLoading: false,
      error: null,
    });
  },
}));

