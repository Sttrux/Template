import type { AuthenticatedUser } from "./auth.interface.js";

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}

export {};

