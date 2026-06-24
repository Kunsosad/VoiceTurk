import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/AppError.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { sendSuccess } from "../../shared/response.js";
import { parseInput } from "../../shared/validators.js";
import { requireAuth } from "./auth.middleware.js";
import { demoLoginSchema, googleLoginSchema, lazorkitLoginSchema } from "./auth.schemas.js";
import { issueToken, mapDemoLoginUser, mapLazorkitUser } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/demo-login", asyncHandler(async (req, res) => {
  if (!env.AUTH_DEMO_MODE) throw new AppError(404, "NOT_FOUND", "Demo login is disabled");
  const input = parseInput(demoLoginSchema, req.body);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { role: input.role, fullName: input.fullName },
    create: input,
  });
  return sendSuccess(res, { user: mapDemoLoginUser(user), token: issueToken(user) });
}));

authRouter.post("/google-login", asyncHandler(async (req, res) => {
  const input = parseInput(googleLoginSchema, req.body);
  const googleResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${input.accessToken}` },
  });

  if (!googleResponse.ok) {
    throw new AppError(401, "GOOGLE_AUTH_FAILED", "Google account verification failed");
  }

  const profile = await googleResponse.json() as {
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  if (!profile.email || !profile.email_verified) {
    throw new AppError(401, "GOOGLE_EMAIL_UNVERIFIED", "Google email is not verified");
  }

  const user = await prisma.user.upsert({
    where: { email: profile.email.toLowerCase() },
    update: { role: input.role, fullName: profile.name ?? profile.email },
    create: {
      email: profile.email.toLowerCase(),
      fullName: profile.name ?? profile.email,
      role: input.role,
    },
  });
  return sendSuccess(res, { user: mapDemoLoginUser(user), token: issueToken(user) });
}));

authRouter.post("/lazorkit-login", asyncHandler(async (req, res) => {
  const input = parseInput(lazorkitLoginSchema, req.body);
  const walletAddress = input.walletAddress ?? input.vaultPda;
  if (!walletAddress) throw new AppError(400, "VALIDATION_ERROR", "walletAddress or vaultPda is required");

  const result = await prisma.$transaction(async (tx) => {
    const linkedWallet = await tx.walletAccount.findUnique({
      where: { walletAddress },
      include: { user: true },
    });
    if (linkedWallet && linkedWallet.user.email !== input.email) {
      throw new AppError(409, "WALLET_ALREADY_LINKED", "Wallet is already linked to another user");
    }

    const user = linkedWallet
      ? await tx.user.update({
          where: { id: linkedWallet.userId },
          data: { fullName: input.fullName, role: input.role, walletAddress },
        })
      : await tx.user.upsert({
          where: { email: input.email },
          update: { fullName: input.fullName, role: input.role, walletAddress },
          create: { email: input.email, fullName: input.fullName, role: input.role, walletAddress },
        });

    const wallet = linkedWallet
      ? await tx.walletAccount.update({
          where: { id: linkedWallet.id },
          data: { smartWallet: input.smartWallet, provider: "lazorkit" },
        })
      : await tx.walletAccount.create({
          data: { userId: user.id, walletAddress, smartWallet: input.smartWallet, provider: "lazorkit" },
        });
    return { user, wallet };
  });

  return sendSuccess(res, {
    user: mapLazorkitUser(result.user),
    wallet: { walletAddress: result.wallet.walletAddress, provider: result.wallet.provider },
    token: issueToken(result.user),
  });
}));

authRouter.get("/me", requireAuth, asyncHandler(async (_req, res) => {
  const user = await prisma.user.findUnique({ where: { id: res.locals.userId as string } });
  if (!user) throw new AppError(401, "UNAUTHORIZED", "Authenticated user no longer exists");
  return sendSuccess(res, mapDemoLoginUser(user));
}));
