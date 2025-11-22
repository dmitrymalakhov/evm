import { Router } from "express";

import { getFeatureFlags } from "../services/features.js";

const router = Router();

router.get("/", (_request, response) => {
  return response.json(getFeatureFlags());
});

export default router;

