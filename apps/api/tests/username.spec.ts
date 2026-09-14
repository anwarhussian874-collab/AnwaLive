import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("API health", () => {
  it("returns service health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});

describe("username validation", () => {
  it("normalizes and validates a safe username", async () => {
    const response = await request(app)
      .post("/v1/usernames/validate")
      .send({ username: "  Creator_01 " });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ normalized: "creator_01", valid: true });
  });

  it("rejects reserved usernames", async () => {
    const response = await request(app)
      .post("/v1/usernames/validate")
      .send({ username: "admin" });

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(false);
    expect(response.body.reason).toContain("reserved");
  });
});
