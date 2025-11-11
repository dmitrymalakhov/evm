import { create } from "zustand";

import { api } from "@/services/api";
import type { Comment, Thought } from "@/types/contracts";

type FeedState = {
    comments: Comment[];
    thoughts: Thought[];
    isLoading: boolean;
    error: string | null;
    load: () => Promise<void>;
    postThought: (text: string) => Promise<Thought>;
    postComment: (
        payload: Pick<Comment, "entityId" | "entityType" | "body"> & {
            parentId?: string;
        },
    ) => Promise<Comment>;
};

export const useFeedStore = create<FeedState>((set, get) => ({
    comments: [],
    thoughts: [],
    isLoading: false,
    error: null,
    async load() {
        set({ isLoading: true });
        try {
            const data = await api.getFeed();
            set({
                comments: data.comments,
                thoughts: data.thoughts,
                isLoading: false,
                error: null,
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Ошибка загрузки ленты",
                isLoading: false,
            });
        }
    },
    async postThought(text) {
        const thought = await api.postThought(text);
        set((state) => ({
            thoughts: [thought, ...state.thoughts],
        }));
        return thought;
    },
    async postComment(payload) {
        const comment = await api.postComment(payload);
        set((state) => ({
            comments: [comment, ...state.comments],
        }));
        return comment;
    },
}));

