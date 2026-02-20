import type { HydratedDocument } from "mongoose";

type UserData = {
  name: string;
  email: string;
  password: string;
};

type UserMethods = {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateJWT(): string;
};

declare global {
  namespace Express {
    interface Request {
      user?: HydratedDocument<UserData, UserMethods>;
    }
  }
}

export {};