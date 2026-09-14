import { Router } from "express";
import { z } from "zod";
import { authProfileSocialStore, type AccountStatus } from "./store.js";

const mapErrorToStatus = (error: unknown): number => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("not found")) {
    return 404;
  }
  if (message.includes("already") || message.includes("invalid") || message.includes("cannot") || message.includes("blocked")) {
    return 400;
  }
  if (message.includes("suspended") || message.includes("banned") || message.includes("deleted")) {
    return 403;
  }
  return 500;
};

const accountStatusSchema = z.enum([
  "active",
  "pending_verification",
  "suspended",
  "banned",
  "deleted"
]) satisfies z.ZodType<AccountStatus>;

const registerSchema = z.object({
  auth_provider_id: z.string().min(1),
  email: z.string().email().optional(),
  username: z.string().min(1),
  display_name: z.string().min(1).optional(),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(160).optional()
});

const authProviderPayloadSchema = z.object({ auth_provider_id: z.string().min(1) });

export const authRouter = Router();

authRouter.post("/register", (req, res) => {
  const body = registerSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    const result = authProfileSocialStore.register({
      authProviderId: body.data.auth_provider_id,
      email: body.data.email,
      username: body.data.username,
      displayName: body.data.display_name,
      avatarUrl: body.data.avatar_url,
      bio: body.data.bio
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(mapErrorToStatus(error)).json({ error: error instanceof Error ? error.message : "Unexpected error" });
  }
});

authRouter.post("/login", (req, res) => {
  const body = authProviderPayloadSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    const user = authProfileSocialStore.login(body.data.auth_provider_id);
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(mapErrorToStatus(error)).json({ error: error instanceof Error ? error.message : "Unexpected error" });
  }
});

authRouter.post("/logout", (req, res) => {
  const body = authProviderPayloadSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    const user = authProfileSocialStore.logout(body.data.auth_provider_id);
    return res.status(200).json({ user, logged_out: true });
  } catch (error) {
    return res.status(mapErrorToStatus(error)).json({ error: error instanceof Error ? error.message : "Unexpected error" });
  }
});

authRouter.post("/verify", (req, res) => {
  const body = authProviderPayloadSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    const result = authProfileSocialStore.verify(body.data.auth_provider_id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(mapErrorToStatus(error)).json({ error: error instanceof Error ? error.message : "Unexpected error" });
  }
});

authRouter.post("/recover", (req, res) => {
  const body = authProviderPayloadSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    const result = authProfileSocialStore.recover(body.data.auth_provider_id);
    return res.status(200).json({ ...result, recovery_initiated: true });
  } catch (error) {
    return res.status(mapErrorToStatus(error)).json({ error: error instanceof Error ? error.message : "Unexpected error" });
  }
});

authRouter.post("/status", (req, res) => {
  const body = z
    .object({
      auth_provider_id: z.string().min(1),
      account_status: accountStatusSchema
    })
    .safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    const result = authProfileSocialStore.setAccountStatus(
      body.data.auth_provider_id,
      body.data.account_status
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(mapErrorToStatus(error)).json({ error: error instanceof Error ? error.message : "Unexpected error" });
  }
});

authRouter.delete("/delete", (req, res) => {
  const body = authProviderPayloadSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    const result = authProfileSocialStore.deleteAccount(body.data.auth_provider_id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(mapErrorToStatus(error)).json({ error: error instanceof Error ? error.message : "Unexpected error" });
  }
});
