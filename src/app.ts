import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import passport from "./config/passport.js";
import { sessionOptions } from "./config/session-store.js";
import { env } from "./config/env.js";
import indexRouter from "./routes/index.routes.js";
import authRouter from "./routes/auth.routes.js";
import adminRouter from "./routes/admin.routes.js";
import postsRouter from "./routes/posts.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { notFoundHandler } from "./middlewares/not-found.middleware.js";
import { requestLogger } from "./middlewares/request-logger.middleware.js";
import { apiRateLimiter } from "./middlewares/rate-limit.middleware.js";

const app = express();

if (env.TRUST_PROXY_HOPS > 0) app.set("trust proxy", env.TRUST_PROXY_HOPS);
app.use(requestLogger);
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
  strictTransportSecurity: env.NODE_ENV === "production" ? undefined : false,
}));
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(apiRateLimiter);
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

app.use("/", indexRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/posts", postsRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;