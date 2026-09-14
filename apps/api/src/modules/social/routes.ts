import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { authProfileSocialStore } from "../auth/store.js";

const socialPayloadSchema = z.object({
  actor_auth_provider_id: z.string().min(1),
  target_public_id: z.string().min(1)
});

const mapErrorToStatus = (error: unknown): number => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("not found")) {
    return 404;
  }
  if (message.includes("blocked") || message.includes("cannot") || message.includes("already")) {
    return 400;
  }
  if (message.includes("banned") || message.includes("suspended") || message.includes("deleted")) {
    return 403;
  }
  return 500;
};

const handleSocialAction = (
  req: Request,
  res: Response,
  action: (actorAuthProviderId: string, targetPublicId: string) => unknown
): Response => {
  const body = socialPayloadSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    return res.status(200).json(
      action(body.data.actor_auth_provider_id, body.data.target_public_id)
    );
  } catch (error) {
    return res.status(mapErrorToStatus(error)).json({ error: error instanceof Error ? error.message : "Unexpected error" });
  }
};

export const socialRouter = Router();

socialRouter.post("/follow", (req, res) =>
  handleSocialAction(req, res, (actorAuthProviderId, targetPublicId) =>
    authProfileSocialStore.follow(actorAuthProviderId, targetPublicId)
  )
);

socialRouter.post("/unfollow", (req, res) =>
  handleSocialAction(req, res, (actorAuthProviderId, targetPublicId) =>
    authProfileSocialStore.unfollow(actorAuthProviderId, targetPublicId)
  )
);

socialRouter.post("/block", (req, res) =>
  handleSocialAction(req, res, (actorAuthProviderId, targetPublicId) =>
    authProfileSocialStore.block(actorAuthProviderId, targetPublicId)
  )
);

socialRouter.post("/unblock", (req, res) =>
  handleSocialAction(req, res, (actorAuthProviderId, targetPublicId) =>
    authProfileSocialStore.unblock(actorAuthProviderId, targetPublicId)
  )
);

socialRouter.post("/mute", (req, res) =>
  handleSocialAction(req, res, (actorAuthProviderId, targetPublicId) =>
    authProfileSocialStore.mute(actorAuthProviderId, targetPublicId)
  )
);

socialRouter.post("/unmute", (req, res) =>
  handleSocialAction(req, res, (actorAuthProviderId, targetPublicId) =>
    authProfileSocialStore.unmute(actorAuthProviderId, targetPublicId)
  )
);

socialRouter.get("/relationship", (req, res) => {
  const query = z
    .object({
      actor_auth_provider_id: z.string().min(1),
      target_public_id: z.string().min(1)
    })
    .safeParse(req.query);

  if (!query.success) {
    return res.status(400).json({ error: "Invalid query" });
  }

  try {
    return res.status(200).json(
      authProfileSocialStore.getRelationship(
        query.data.actor_auth_provider_id,
        query.data.target_public_id
      )
    );
  } catch (error) {
    return res.status(mapErrorToStatus(error)).json({ error: error instanceof Error ? error.message : "Unexpected error" });
  }
});
