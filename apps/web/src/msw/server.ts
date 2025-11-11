import { setupServer } from "msw/node";

import { handlers } from "@/msw/handlers";

export const server = setupServer(...handlers);

export function enableTestMocks(): void {
  server.listen({ onUnhandledRequest: "warn" });
}

export function resetTestMocks(): void {
  server.resetHandlers();
}

export function disableTestMocks(): void {
  server.close();
}

