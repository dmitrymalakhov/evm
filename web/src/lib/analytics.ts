type AnalyticsPayload = Record<string, unknown>;

export function track(event: string, payload: AnalyticsPayload = {}): void {
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${event}`, payload);
}

export const ANALYTICS_EVENTS = {
  loginSuccess: "auth.login.success",
  levelSubmit: "level.task.submit",
  thoughtPosted: "feed.thought.posted",
  ticketViewed: "tickets.view",
  validatorCheck: "validator.check",
} as const;

