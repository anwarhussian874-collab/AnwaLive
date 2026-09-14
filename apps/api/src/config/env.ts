import { z } from "zod";

const envSchema = z.object({
  ANWALIVE_API_NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ANWALIVE_API_PORT: z.coerce.number().int().positive().default(4000),
  ANWALIVE_API_CORS_ORIGIN: z.string().min(1).default("http://localhost:3000")
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
