import type { SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { env } from "../../config/env.js";

export const issueToken = (user: User) => jwt.sign(
  { role: user.role },
  env.JWT_SECRET,
  {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  },
);

export const verifyToken = (token: string) => jwt.verify(token, env.JWT_SECRET);

export const mapDemoLoginUser = (user: User) => ({
  id: user.id,
  role: user.role,
  fullName: user.fullName,
  email: user.email,
});

export const mapLazorkitUser = (user: User) => ({
  id: user.id,
  role: user.role,
  fullName: user.fullName,
  walletAddress: user.walletAddress,
});
