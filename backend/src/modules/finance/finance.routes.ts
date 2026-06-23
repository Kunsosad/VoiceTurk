import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { sendSuccess } from "../../shared/response.js";
import { parseInput } from "../../shared/validators.js";
import { buyerFinanceQuerySchema, contributorFinanceQuerySchema, withdrawalSchema } from "./finance.schemas.js";

export const buyerFinanceRouter = Router();
export const contributorFinanceRouter = Router();

buyerFinanceRouter.get("/", asyncHandler(async (req, res) => {
  const { buyerId } = parseInput(buyerFinanceQuerySchema, req.query);
  const campaigns = await prisma.campaign.findMany({
    where: { buyerId },
    include: { recordings: { select: { status: true, contributorId: true } } },
    orderBy: { createdAt: "desc" },
  });
  const totalSecuredBudget = campaigns.reduce((sum, item) => sum + item.budgetSecured, 0);
  const payoutAccrued = campaigns.reduce(
    (sum, item) => sum + item.recordings.filter((recording) => recording.status === "Accepted").length * item.rewardPerAcceptedRecording,
    0,
  );
  const pendingReviewImpact = campaigns.reduce(
    (sum, item) => sum + item.recordings.filter((recording) => recording.status === "Pending review").length * item.rewardPerAcceptedRecording,
    0,
  );
  const contributorIds = [...new Set(campaigns.flatMap((campaign) => campaign.recordings.map((item) => item.contributorId)))];
  const contributors = await prisma.user.findMany({ where: { id: { in: contributorIds } }, select: { id: true, fullName: true } });

  return sendSuccess(res, {
    summary: {
      totalSecuredBudget,
      payoutAccrued,
      remainingBudget: totalSecuredBudget - payoutAccrued,
      pendingReviewImpact,
    },
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      budgetSecured: campaign.budgetSecured,
      payoutAccrued: campaign.recordings.filter((item) => item.status === "Accepted").length * campaign.rewardPerAcceptedRecording,
      pendingReviewImpact: campaign.recordings.filter((item) => item.status === "Pending review").length * campaign.rewardPerAcceptedRecording,
    })),
    contributors: contributors.map((contributor) => {
      const records = campaigns.flatMap((campaign) => campaign.recordings.map((recording) => ({ ...recording, reward: campaign.rewardPerAcceptedRecording })))
        .filter((recording) => recording.contributorId === contributor.id);
      return {
        contributorId: contributor.id,
        fullName: contributor.fullName,
        acceptedRecordings: records.filter((item) => item.status === "Accepted").length,
        payoutAccrued: records.filter((item) => item.status === "Accepted").reduce((sum, item) => sum + item.reward, 0),
      };
    }),
  });
}));

contributorFinanceRouter.get("/", asyncHandler(async (req, res) => {
  const { contributorId } = parseInput(contributorFinanceQuerySchema, req.query);
  const recordings = await prisma.recording.findMany({
    where: { contributorId },
    include: { campaign: true },
    orderBy: { createdAt: "desc" },
  });
  const accepted = recordings.filter((item) => item.status === "Accepted");
  const pending = recordings.filter((item) => item.status === "Pending review");
  const campaignIds = [...new Set(recordings.map((item) => item.campaignId))];

  return sendSuccess(res, {
    summary: {
      submittedRecordings: recordings.length,
      acceptedRecordings: accepted.length,
      pendingReview: pending.length,
      approvedReward: accepted.reduce((sum, item) => sum + item.campaign.rewardPerAcceptedRecording, 0),
      pendingPotentialReward: pending.reduce((sum, item) => sum + item.campaign.rewardPerAcceptedRecording, 0),
    },
    campaigns: campaignIds.map((campaignId) => {
      const campaignRecordings = recordings.filter((item) => item.campaignId === campaignId);
      const campaign = campaignRecordings[0]!.campaign;
      return {
        id: campaign.id,
        name: campaign.name,
        submittedRecordings: campaignRecordings.length,
        acceptedRecordings: campaignRecordings.filter((item) => item.status === "Accepted").length,
        approvedReward: campaignRecordings.filter((item) => item.status === "Accepted").length * campaign.rewardPerAcceptedRecording,
      };
    }),
  });
}));

contributorFinanceRouter.post("/withdraw", asyncHandler(async (req, res) => {
  const input = parseInput(withdrawalSchema, req.body);
  const contributor = await prisma.user.findUnique({ where: { id: input.contributorId } });
  if (!contributor || contributor.role !== "Contributor") throw new AppError(400, "INVALID_CONTRIBUTOR", "Contributor not found");

  const [payout, withdrawals] = await Promise.all([
    prisma.financeLedger.aggregate({ where: { userId: input.contributorId, type: "Contributor payout", status: "Completed" }, _sum: { amount: true } }),
    prisma.financeLedger.aggregate({ where: { userId: input.contributorId, type: "Withdrawal", status: { in: ["Scheduled", "Completed"] } }, _sum: { amount: true } }),
  ]);
  const available = (payout._sum.amount ?? 0) - (withdrawals._sum.amount ?? 0);
  if (input.amount > available) throw new AppError(400, "INSUFFICIENT_BALANCE", "Withdrawal amount exceeds approved reward");

  await prisma.financeLedger.create({
    data: { type: "Withdrawal", status: "Scheduled", amount: input.amount, userId: input.contributorId, walletAddress: input.walletAddress },
  });
  return sendSuccess(res, { status: "Scheduled", amount: input.amount, message: "Withdrawal scheduled in demo mode." });
}));
