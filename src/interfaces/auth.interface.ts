export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface UserCredentials extends AuthenticatedUser {
  passwordHash: string;
}
