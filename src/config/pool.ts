import { Pool } from "pg";
import { env } from "./env.js";
import { logError } from "../utils/logger.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (error) => {
  logError("postgres_pool_error", error);
});
