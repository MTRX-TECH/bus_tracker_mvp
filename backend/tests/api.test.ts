import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/server";
import { UserModel } from "../src/models/User";
import { OrganizationModel } from "../src/models/Organization";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("🏆 RIT Bus Tracker - Enterprise API Automated Test Suite", () => {
  it("GET /api/health should respond with healthy platform status and RIT credits", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("HEALTHY");
    expect(res.body.developer).toBe("RIT");
    expect(res.body.ceo).toBe("");
  });

  it("GET /api/team should display Global About Team profiles accessible without authentication", async () => {
    const res = await request(app).get("/api/team");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.team.length).toBeGreaterThan(5);
    expect(res.body.specialThanks).toBe("RAMCO INSTITUTE OF TECHNOLOGY");
  });

  it("POST /api/auth/login with incorrect credentials should return 401 Unauthorized", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "fake@mtrxtech.com",
      password: "WrongPassword123!",
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
