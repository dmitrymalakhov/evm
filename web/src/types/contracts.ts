export type Role = "user" | "mod" | "admin";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  teamId?: string;
  title?: string;
  avatarUrl?: string;
};

export type LevelState = "scheduled" | "open" | "closed";

export type Level = {
  id: string;
  week: number;
  title: string;
  state: LevelState;
  opensAt: string;
  closesAt: string;
  iteration?: Iteration;
  config: {
    storyline: string;
    hint?: string;
  };
};

export type TaskType = "quiz" | "cipher" | "upload" | "vote" | "qr" | "final";

export type TaskConfig = Record<string, unknown>;

export type Task = {
  id: string;
  levelId: string;
  type: TaskType;
  title: string;
  description: string;
  points: number;
  config: TaskConfig;
};

export type SubmissionResponse = {
  status: "accepted" | "rejected" | "pending";
  hint?: string;
  message?: string;
};

export type CommentStatus = "ok" | "hidden";

export type Comment = {
  id: string;
  parentId?: string;
  entityType: "task" | "feed" | "idea";
  entityId: string;
  userId: string;
  body: string;
  createdAt: string;
  status: CommentStatus;
};

export type Thought = {
  id: string;
  text: string;
  createdAt: string;
};

export type TicketStatus = "issued" | "none";

export type Ticket = {
  id: string;
  userId: string;
  qr: string;
  pdfUrl: string;
  status: TicketStatus;
};

export type Team = {
  id: string;
  name: string;
  slogan: string;
  progress: number;
};

export type ChatMessage = {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
};

export type Idea = {
  id: string;
  teamId: string;
  title: string;
  description: string;
  votes: number;
  createdAt: string;
  userHasVoted?: boolean;
};

export type MetricPoint = {
  label: string;
  value: number;
};

export type Iteration = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  totalWeeks: number;
  currentWeek: number;
};

export type TeamWeeklyStat = {
  week: number;
  points: number;
  tasksCompleted: number;
};

export type TeamProgressSummary = {
  progress: number;
  totalPoints: number;
  unlockedKeys: string[];
  completedTasks: string[];
  completedWeeks: number[];
  weeklyStats: TeamWeeklyStat[];
};

export type AdminMetrics = {
  dau: MetricPoint[];
  wau: MetricPoint[];
  funnel: Array<{ step: string; value: number }>;
};

export type ValidatorResponse = {
  status: "valid" | "invalid";
  message: string;
};

export type UserWeekProgress = {
  week: number;
  tasksCompleted: number;
  totalTasks: number;
  pointsEarned: number;
  isCompleted: boolean;
  finishedAt?: string;
  keyId?: string;
  title?: string;
};

export type UserIterationProgress = {
  iteration: Iteration;
  weeks: UserWeekProgress[];
  unlockedKeys: string[];
  titles: Array<{ id: string; week: number; title: string; description: string }>;
  totalPoints: number;
};

export type ThoughtFeed = {
  comments: Comment[];
  thoughts: Thought[];
};

export type TaskCompletionStat = {
  taskId: string;
  taskTitle: string;
  taskType: string;
  levelId: string;
  levelWeek: number;
  completedCount: number;
  totalSubmissions: number;
};

export type UserProgressStat = {
  userId: string;
  userName: string;
  userEmail: string;
  tasksCompleted: number;
  weeksCompleted: number;
  totalActions: number;
  lastActivityAt: string;
};

export type WeeklyActivityStat = {
  date: string;
  actionType: string;
  count: number;
};

export type TopUserStat = {
  userId: string;
  userName: string;
  userEmail: string;
  totalActions: number;
  tasksCompleted: number;
};

export type TaskCompletionByWeek = {
  week: number;
  levelTitle: string;
  tasksCompleted: number;
  usersCompleted: number;
};

export type UserActivityTimeline = {
  date: string;
  actionType: string;
  count: number;
};

export type SecretSantaParticipantStatus = "waiting" | "matched" | "gifted";

export type SecretSantaParticipant = {
  id: string;
  name: string;
  department: string;
  wishlist: string;
  status: SecretSantaParticipantStatus;
};

export type SecretSantaState = {
  participants: SecretSantaParticipant[];
  stats: {
    total: number;
    matched: number;
    gifted: number;
  };
  me: {
    participant: (SecretSantaParticipant & {
      reminderNote: string | null;
      matchedUserId: string | null;
    }) | null;
    recipient: SecretSantaParticipant | null;
  };
};

