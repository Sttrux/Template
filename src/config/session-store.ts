import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import { env } from "./env.js";
import { pool } from "./pool.js";

const PgSessionStore = connectPgSimple(session);

export const sessionStore = new PgSessionStore({
  pool,
  tableName: "sessions",
  createTableIfMissing: false,
});

export const sessionOptions: session.SessionOptions = {
  name: "template.sid",
  secret: env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: env.SESSION_COOKIE_SAME_SITE,
    maxAge: env.SESSION_MAX_AGE_MS,
  },
};
