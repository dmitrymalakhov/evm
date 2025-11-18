import { Router } from "express";

import adminRouter from "./admin";
import analyticsRouter from "./analytics";
import authRouter from "./auth";
import commentsRouter from "./comments";
import feedRouter from "./feed";
import featuresRouter from "./features";
import levelsRouter from "./levels";
import meRouter from "./me";
import tasksRouter from "./tasks";
import teamsRouter from "./teams";
import thoughtsRouter from "./thoughts";
import ticketsRouter from "./tickets";
import uploadsRouter from "./uploads";
import validatorRouter from "./validator";
import secretSantaRouter from "./secret-santa";

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

export default router;

