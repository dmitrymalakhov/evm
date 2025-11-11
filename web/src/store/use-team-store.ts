import { create } from "zustand";

import { api } from "@/services/api";
import type { Idea, Team, TeamProgressSummary } from "@/types/contracts";

type ChatMessage = {
    id: string;
    teamId: string;
    userId: string;
    userName: string;
    body: string;
    createdAt: string;
};

type TeamState = {
    team: Team | null;
    chat: ChatMessage[];
    ideas: Idea[];
    progress: TeamProgressSummary | null;
    isLoading: boolean;
    teamId: string | null;
    error: string | null;
    hydrate: (teamId: string) => Promise<void>;
    sendMessage: (body: string) => Promise<void>;
    createIdea: (title: string, description: string) => Promise<Idea>;
    updateIdea: (ideaId: string, updates: Partial<Idea>) => Promise<Idea>;
    voteIdea: (ideaId: string) => Promise<Idea>;
    refreshProgress: () => Promise<void>;
};

const normalizeIdea = (idea: Idea): Idea => ({
    ...idea,
    userHasVoted: Boolean(idea.userHasVoted),
});

export const useTeamStore = create<TeamState>((set, get) => ({
    team: null,
    chat: [],
    ideas: [],
    progress: null,
    isLoading: false,
    teamId: null,
    error: null,
    async hydrate(teamId) {
        set({ isLoading: true, teamId, error: null });
        try {
            const [team, chat, ideas, progress] = await Promise.all([
                api.getTeam(teamId),
                api.getTeamChat(teamId),
                api.getTeamIdeas(teamId),
                api.getTeamProgress(teamId),
            ]);
            set({
                team,
                chat,
                ideas: ideas.map(normalizeIdea),
                progress,
                isLoading: false,
            });
        } catch (error) {
            set({
                error:
                    error instanceof Error ? error.message : "Не удалось загрузить команду",
                isLoading: false,
            });
        }
    },
    async sendMessage(body) {
        const { teamId } = get();
        if (!teamId) return;
        const message = await api.postTeamChatMessage(teamId, body);
        set((state) => ({
            chat: [...state.chat, message as ChatMessage],
        }));
    },
    async createIdea(title, description) {
        const { teamId } = get();
        if (!teamId) {
            throw new Error("Команда не определена");
        }
        const idea = normalizeIdea(
            await api.createTeamIdea(teamId, { title, description }),
        );
        set((state) => ({
            ideas: [idea, ...state.ideas],
        }));
        return idea;
    },
    async updateIdea(ideaId, updates) {
        const { teamId } = get();
        if (!teamId) {
            throw new Error("Команда не определена");
        }
        const idea = normalizeIdea(
            await api.updateTeamIdea(teamId, ideaId, updates),
        );
        set((state) => ({
            ideas: state.ideas.map((item) =>
                item.id === idea.id ? idea : item,
            ),
        }));
        return idea;
    },
    async voteIdea(ideaId) {
        const { teamId } = get();
        if (!teamId) {
            throw new Error("Команда не определена");
        }
        const current = get().ideas.find((idea) => idea.id === ideaId);
        const idea = normalizeIdea(
            current?.userHasVoted
                ? await api.removeTeamIdeaVote(teamId, ideaId)
                : await api.voteForTeamIdea(teamId, ideaId),
        );
        set((state) => ({
            ideas: state.ideas.map((item) =>
                item.id === idea.id ? idea : item,
            ),
        }));
        return idea;
    },
    async refreshProgress() {
        const { teamId } = get();
        if (!teamId) return;
        const progress = await api.getTeamProgress(teamId);
        set({ progress });
    },
}));

