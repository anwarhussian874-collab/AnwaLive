import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.ANWALIVE_API_CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.use(apiRouter);
