import { Router } from "express";

import { getThoughtFeed } from "../services/feed";

const router = Router();

router.get("/", (_request, response) => {
  return response.json(getThoughtFeed());
});

export default router;

