import { db } from "../db/client";
import { featureFlags } from "../db/schema";

export function getFeatureFlags() {
  const flags = db.select().from(featureFlags).limit(1).get();
  if (flags) {
    return {
      realtime: Boolean(flags.realtime),
      payments: Boolean(flags.payments),
      admin: Boolean(flags.admin),
    };
  }
  return {
    realtime: true,
    payments: false,
    admin: true,
  };
}

