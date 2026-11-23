import type { RequestHandler } from "express";
import { matchedData } from "express-validator";
import { env } from "../config/env.js";
import passport from "../config/passport.js";
import { createAccessToken, registerUser, verifyCredentials } from "../services/auth.service.js";
import { AppError } from "../utils/app-error.js";
import { createCsrfToken } from "../utils/csrf.js";

interface LoginInput {
  login: string;
  password: string;
}

export const register: RequestHandler = async (req, res) => {
  const input = matchedData<{ username: string; email: string; password: string }>(
    req,
    { locations: ["body"] },
  );
  const user = await registerUser(input);
  res.status(201).json({ user });
};

export const authenticateLocal: RequestHandler = (req, res, next) => {
  passport.authenticate("local", (error: unknown, user: Express.User | false) => {
    if (error) return next(error);
    if (!user) return next(new AppError(401, "Invalid login or password"));

    req.logIn(user, (loginError) => {
      if (loginError) return next(loginError);
      return next();
    });
  })(req, res, next);
};

export const sessionLogin: RequestHandler = (req, res) => {
  if (!req.user) throw new AppError(401, "Invalid login or password");
  const csrfToken = createCsrfToken();
  req.session.csrfToken = csrfToken;
  res.json({ user: req.user, csrfToken });
};

export const sessionCsrf: RequestHandler = (req, res) => {
  const csrfToken = createCsrfToken();
  req.session.csrfToken = csrfToken;
  res.json({ csrfToken });
};

export const sessionLogout: RequestHandler = (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) return next(logoutError);

    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);
      res.clearCookie("template.sid", {
        httpOnly: true,
        secure: env.SESSION_COOKIE_SECURE,
        sameSite: env.SESSION_COOKIE_SAME_SITE,
      });
      return res.status(204).end();
    });
  });
};

export const sessionMe: RequestHandler = (req, res) => {
  if (!req.user) throw new AppError(401, "Login required");
  res.json({ user: req.user });
};

export const createToken: RequestHandler = async (req, res) => {
  const { login, password } = matchedData<LoginInput>(req, { locations: ["body"] });
  const user = await verifyCredentials(login, password);
  if (!user) throw new AppError(401, "Invalid login or password");

  const accessToken = await createAccessToken(user);
  res.json({
    accessToken,
    tokenType: "Bearer",
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
    user,
  });
};

export const tokenMe: RequestHandler = (req, res) => {
  if (!req.user) throw new AppError(401, "Login required");
  res.json({ user: req.user });
};
