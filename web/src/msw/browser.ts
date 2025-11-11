import { setupWorker } from "msw/browser";

import { handlers } from "@/msw/handlers";

let worker: ReturnType<typeof setupWorker> | null = null;

export async function startMockServiceWorker() {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_API_MOCKING === "disabled") return;
  if (worker) return;

  worker = setupWorker(...handlers);
  await worker.start({
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
    onUnhandledRequest(request, print) {
      if (process.env.NODE_ENV === "development") {
        print.warning();
      }
    },
  });
  // eslint-disable-next-line no-console
  console.info("MSW worker started");
}

export function stopMockServiceWorker() {
  if (!worker) return;
  worker.stop();
  worker = null;
}

