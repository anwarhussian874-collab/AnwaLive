import { Router } from "express";
import { z } from "zod";
import { validateUsername } from "../modules/profiles/username.js";

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
