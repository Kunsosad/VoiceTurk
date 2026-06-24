import cors from "cors";
import express from "express";
import { agoraRouter } from "./agora/agora.routes.js";
import { env } from "./config/env.js";
import { agreementRouter, campaignConsentRouter } from "./modules/agreements/agreement.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { campaignRouter } from "./modules/campaigns/campaign.routes.js";
import { certificateRouter } from "./modules/certificates/certificate.routes.js";
import { conversationRouter } from "./modules/conversations/conversation.routes.js";
import { buyerFinanceRouter, contributorFinanceRouter, contributorWithdrawalRouter } from "./modules/finance/finance.routes.js";
import { campaignRecordingRouter, recordingRouter } from "./modules/recordings/recording.routes.js";
import { reviewRouter } from "./modules/reviews/review.routes.js";
import { solanaRouter } from "./solana/lazorkit.routes.js";
import { ensureRecordingsDirectory } from "./storage/local-storage.service.js";
import { storageRouter } from "./storage/storage.routes.js";
import { errorHandler, notFoundHandler } from "./shared/errorMiddleware.js";
import { sendSuccess } from "./shared/response.js";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads/recordings", express.static(ensureRecordingsDirectory(), { dotfiles: "deny", index: false }));

app.get("/api/health", (_req, res) => sendSuccess(res, { status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/agora", agoraRouter);
app.use("/api/solana", solanaRouter);
app.use("/api/agreements", agreementRouter);
app.use("/api/campaigns", campaignConsentRouter);
app.use("/api/campaigns", campaignRecordingRouter);
app.use("/api/campaigns", campaignRouter);
app.use("/api/recordings", reviewRouter);
app.use("/api/recordings", storageRouter);
app.use("/api/recordings", recordingRouter);
app.use("/api/buyer/finance", buyerFinanceRouter);
app.use("/api/contributor/finance", contributorFinanceRouter);
app.use("/api/contributor/withdraw", contributorWithdrawalRouter);
app.use("/api/certificates", certificateRouter);

app.use(notFoundHandler);
app.use(errorHandler);
