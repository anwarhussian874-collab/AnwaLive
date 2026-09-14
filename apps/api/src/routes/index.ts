import { Router } from "express";
import { z } from "zod";
import { authRouter } from "../modules/auth/routes.js";
import { profilesRouter } from "../modules/profiles/routes.js";
import { validateUsername } from "../modules/profiles/username.js";
import { socialRouter } from "../modules/social/routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ service: "anwalive-api", status: "ok" });
});

apiRouter.post("/v1/usernames/validate", (req, res) => {
  const body = z.object({ username: z.string().min(1) }).safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const result = validateUsername(body.data.username);
  return res.status(200).json(result);
});

apiRouter.use("/v1/auth", authRouter);
apiRouter.use("/v1/profiles", profilesRouter);
apiRouter.use("/v1/social", socialRouter);
