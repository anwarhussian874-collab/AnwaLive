import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("auth/profile/social graph", () => {
  it("handles registration, verification, login and profile lookup", async () => {
    const registerRes = await request(app).post("/v1/auth/register").send({
      auth_provider_id: "user_clerk_a",
      email: "a@example.com",
      username: "Creator_A",
      display_name: "Creator A"
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user.authProviderId).toBe("user_clerk_a");
    expect(registerRes.body.profile.username).toBe("creator_a");

    const verifyRes = await request(app).post("/v1/auth/verify").send({
      auth_provider_id: "user_clerk_a"
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.user.emailVerified).toBe(true);
    expect(verifyRes.body.user.accountStatus).toBe("active");

    const loginRes = await request(app).post("/v1/auth/login").send({
      auth_provider_id: "user_clerk_a"
    });

    expect(loginRes.status).toBe(200);

    const publicId = registerRes.body.profile.publicId as string;

    const profileRes = await request(app).get(`/v1/profiles/${publicId}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.profile.displayName).toBe("Creator A");
  });

  it("enforces block behavior for follow and messaging relationship", async () => {
    const registerA = await request(app).post("/v1/auth/register").send({
      auth_provider_id: "user_clerk_b",
      email: "b@example.com",
      username: "Creator_B"
    });

    const registerB = await request(app).post("/v1/auth/register").send({
      auth_provider_id: "user_clerk_c",
      email: "c@example.com",
      username: "Creator_C"
    });

    expect(registerA.status).toBe(201);
    expect(registerB.status).toBe(201);

    const bPublicId = registerB.body.profile.publicId as string;

    const firstFollow = await request(app).post("/v1/social/follow").send({
      actor_auth_provider_id: "user_clerk_b",
      target_public_id: bPublicId
    });

    expect(firstFollow.status).toBe(200);
    expect(firstFollow.body.following).toBe(true);

    const duplicateFollow = await request(app).post("/v1/social/follow").send({
      actor_auth_provider_id: "user_clerk_b",
      target_public_id: bPublicId
    });

    expect(duplicateFollow.status).toBe(200);
    expect(duplicateFollow.body.following).toBe(true);

    const block = await request(app).post("/v1/social/block").send({
      actor_auth_provider_id: "user_clerk_c",
      target_public_id: registerA.body.profile.publicId
    });

    expect(block.status).toBe(200);

    const blockedFollow = await request(app).post("/v1/social/follow").send({
      actor_auth_provider_id: "user_clerk_b",
      target_public_id: bPublicId
    });

    expect(blockedFollow.status).toBe(400);

    const relationship = await request(app).get("/v1/social/relationship").query({
      actor_auth_provider_id: "user_clerk_b",
      target_public_id: bPublicId
    });

    expect(relationship.status).toBe(200);
    expect(relationship.body.canFollow).toBe(false);
    expect(relationship.body.canMessage).toBe(false);

    const unblock = await request(app).post("/v1/social/unblock").send({
      actor_auth_provider_id: "user_clerk_c",
      target_public_id: registerA.body.profile.publicId
    });

    expect(unblock.status).toBe(200);

    const refollow = await request(app).post("/v1/social/follow").send({
      actor_auth_provider_id: "user_clerk_b",
      target_public_id: bPublicId
    });

    expect(refollow.status).toBe(200);
  });

  it("handles suspend, recover, logout and delete", async () => {
    const registerRes = await request(app).post("/v1/auth/register").send({
      auth_provider_id: "user_clerk_d",
      username: "Creator_D"
    });

    expect(registerRes.status).toBe(201);

    const suspendRes = await request(app).post("/v1/auth/status").send({
      auth_provider_id: "user_clerk_d",
      account_status: "suspended"
    });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.user.accountStatus).toBe("suspended");

    const loginWhileSuspended = await request(app).post("/v1/auth/login").send({
      auth_provider_id: "user_clerk_d"
    });

    expect(loginWhileSuspended.status).toBe(403);

    const recoverRes = await request(app).post("/v1/auth/recover").send({
      auth_provider_id: "user_clerk_d"
    });

    expect(recoverRes.status).toBe(200);
    expect(recoverRes.body.recovery_initiated).toBe(true);

    const logoutRes = await request(app).post("/v1/auth/logout").send({
      auth_provider_id: "user_clerk_d"
    });

    expect(logoutRes.status).toBe(200);

    const deleteRes = await request(app).delete("/v1/auth/delete").send({
      auth_provider_id: "user_clerk_d"
    });

    expect(deleteRes.status).toBe(200);

    const loginAfterDelete = await request(app).post("/v1/auth/login").send({
      auth_provider_id: "user_clerk_d"
    });

    expect(loginAfterDelete.status).toBe(404);
  });
});
