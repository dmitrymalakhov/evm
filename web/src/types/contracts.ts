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
  status: "accepted" | "rejected";
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

export type AdminMetrics = {
  dau: MetricPoint[];
  wau: MetricPoint[];
  funnel: Array<{ step: string; value: number }>;
};

export type ValidatorResponse = {
  status: "valid" | "invalid";
  message: string;
};

export type ThoughtFeed = {
  comments: Comment[];
  thoughts: Thought[];
};

