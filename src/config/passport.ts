import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { verifyCredentials } from "../services/auth.service.js";
import { findAuthUserById } from "../repository/user.repository.js";

passport.use(
  new LocalStrategy({ usernameField: "login", passwordField: "password" }, async (login, password, done) => {
    try {
      const user = await verifyCredentials(login, password);
      return done(null, user || false);
    } catch (error) {
      return done(error);
    }
  }),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: unknown, done) => {
  try {
    const userId = Number(id);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return done(new Error("Invalid user ID"));
    }

    const user = await findAuthUserById(userId);
    return done(null, user || false);
  } catch (error) {
    return done(error);
  }
});

export default passport;
