import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  DEMO_AUTH_ENABLED: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  AUTH_SECRET: z.string().min(32),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production" && data.DEMO_AUTH_ENABLED)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Demo authentication must be disabled in production", path: ["DEMO_AUTH_ENABLED"] });
});
export const env = schema.parse(process.env);
