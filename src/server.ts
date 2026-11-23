import app from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/pool.js";
import { sessionStore } from "./config/session-store.js";
import { db } from "./prisma/db.js";
import { logError, logInfo } from "./utils/logger.js";

const server = app.listen(env.PORT, () => {
  logInfo("server_started", { port: env.PORT, environment: env.NODE_ENV });
});

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logInfo("server_shutting_down", { signal });

  let shutdownFailed = false;
  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  } catch (error) {
    logError("server_shutdown_error", error);
    shutdownFailed = true;
  }

  sessionStore.close();
  const closeResults = await Promise.allSettled([pool.end(), db.close()]);
  for (const result of closeResults) {
    if (result.status === "rejected") {
      logError("database_shutdown_error", result.reason);
      shutdownFailed = true;
    }
  }
  process.exitCode = shutdownFailed ? 1 : 0;
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
