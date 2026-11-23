import "dotenv/config";
import { z } from "zod";

const secret = z
  .string()
  .min(32)
  .refine((value) => !value.startsWith("replace-"), "Replace the example secret");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must use PostgreSQL",
    ),
  JWT_SECRET: secret,
  SESSION_SECRET: secret,
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),
  SESSION_MAX_AGE_MS: z.coerce.number().int().min(60000).default(86400000),
  SESSION_COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
    .refine(
      (origins) =>
        origins.every((origin) => {
          try {
            return ["http:", "https:"].includes(new URL(origin).protocol);
          } catch {
            return false;
          }
        }),
      "CORS_ORIGINS must be a comma-separated list of HTTP(S) origins",
    ),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

if (result.data.NODE_ENV === "production" && result.data.CORS_ORIGINS.length === 0) {
  throw new Error("CORS_ORIGINS must contain at least one origin in production");
}

if (
  (result.data.NODE_ENV === "production" || result.data.SESSION_COOKIE_SAME_SITE === "none") &&
  !result.data.SESSION_COOKIE_SECURE
) {
  throw new Error("SESSION_COOKIE_SECURE=true is required for production or SameSite=None");
}

export const env = result.data;
