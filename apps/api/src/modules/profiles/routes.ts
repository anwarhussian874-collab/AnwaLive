import { Router } from "express";
import { authProfileSocialStore } from "../auth/store.js";

export const profilesRouter = Router();

profilesRouter.get("/by-auth/:authProviderId", (req, res) => {
  const profile = authProfileSocialStore.getProfileByAuthProviderId(req.params.authProviderId);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  return res.status(200).json({ profile });
});

profilesRouter.get("/:publicId", (req, res) => {
  const profile = authProfileSocialStore.getProfileByPublicId(req.params.publicId);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  return res.status(200).json({ profile });
});
