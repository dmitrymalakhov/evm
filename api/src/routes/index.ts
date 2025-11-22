import { Router } from "express";

import adminRouter from "./admin.js";
import analyticsRouter from "./analytics.js";
import authRouter from "./auth.js";
import commentsRouter from "./comments.js";
import feedRouter from "./feed.js";
import featuresRouter from "./features.js";
import levelsRouter from "./levels.js";
import meRouter from "./me.js";
import tasksRouter from "./tasks.js";
import teamsRouter from "./teams.js";
import thoughtsRouter from "./thoughts.js";
import ticketsRouter from "./tickets.js";
import uploadsRouter from "./uploads.js";
import validatorRouter from "./validator.js";
import secretSantaRouter from "./secret-santa.js";
import telegramRouter from "./telegram.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/features", featuresRouter);
router.use("/me", meRouter);
router.use("/levels", levelsRouter);
router.use("/tasks", tasksRouter);
router.use("/feed", feedRouter);
router.use("/thoughts", thoughtsRouter);
router.use("/comments", commentsRouter);
router.use("/tickets", ticketsRouter);
router.use("/teams", teamsRouter);
router.use("/admin", adminRouter);
router.use("/analytics", analyticsRouter);
router.use("/validator", validatorRouter);
router.use("/uploads", uploadsRouter);
router.use("/secret-santa", secretSantaRouter);
router.use("/telegram", telegramRouter);

export default router;

