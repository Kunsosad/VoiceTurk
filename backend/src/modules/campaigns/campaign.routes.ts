import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { mapCampaign, mapCertificate, mapFinanceLedger } from "../../shared/mappers.js";
import { sendSuccess } from "../../shared/response.js";
import { idParamSchema, parseInput } from "../../shared/validators.js";
import { createProof } from "../../solana/proof.service.js";
import {
  activateCampaignSchema,
  campaignQuerySchema,
  createCampaignSchema,
  fundCampaignSchema,
  updateCampaignSchema,
} from "./campaign.schemas.js";

export const campaignRouter = Router();

const campaignInclude = { recordings: { select: { status: true } } } as const;

const getCampaign = async (id: string) => {
  const campaign = await prisma.campaign.findUnique({ where: { id }, include: campaignInclude });
  if (!campaign) throw new AppError(404, "NOT_FOUND", "Campaign not found");
  return campaign;
};

campaignRouter.get("/", asyncHandler(async (req, res) => {
  const query = parseInput(campaignQuerySchema, req.query);
  const campaigns = await prisma.campaign.findMany({
    where: {
      buyerId: query.buyerId,
      status: query.status,
      ...(query.role === "Contributor" ? { status: "Active" } : {}),
    },
    include: campaignInclude,
    orderBy: { createdAt: "desc" },
  });
  return sendSuccess(res, campaigns.map(mapCampaign));
}));

campaignRouter.post("/", asyncHandler(async (req, res) => {
  const input = parseInput(createCampaignSchema, req.body);
  const buyer = await prisma.user.findUnique({ where: { id: input.buyerId } });
  if (!buyer || buyer.role !== "Buyer") throw new AppError(400, "INVALID_BUYER", "Buyer not found");

  const campaign = await prisma.campaign.create({
    data: { ...input, status: "Draft" },
    include: campaignInclude,
  });
  return sendSuccess(res, mapCampaign(campaign), 201);
}));

campaignRouter.get("/:id", asyncHandler(async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params);
  return sendSuccess(res, mapCampaign(await getCampaign(id)));
}));

campaignRouter.patch("/:id", asyncHandler(async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params);
  const input = parseInput(updateCampaignSchema, req.body);
  await getCampaign(id);
  const campaign = await prisma.campaign.update({ where: { id }, data: input, include: campaignInclude });
  return sendSuccess(res, mapCampaign(campaign));
}));

campaignRouter.post("/:id/fund", asyncHandler(async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params);
  const input = parseInput(fundCampaignSchema, req.body);
  const existing = await getCampaign(id);
  if (existing.buyerId !== input.buyerId) throw new AppError(403, "FORBIDDEN", "Only the campaign buyer can fund it");
  if (existing.budgetSecured !== 0 && existing.budgetSecured !== input.amount) {
    throw new AppError(409, "CAMPAIGN_ALREADY_FUNDED", "Campaign is already funded with a different amount");
  }

  const result = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.update({
      where: { id },
      data: { budgetSecured: input.amount },
      include: campaignInclude,
    });
    const priorLedger = await tx.financeLedger.findFirst({ where: { campaignId: id, type: "Budget secured" } });
    const financeLedger = priorLedger ?? await tx.financeLedger.create({
      data: { type: "Budget secured", status: "Completed", amount: input.amount, campaignId: id, userId: input.buyerId },
    });
    const certificate = await tx.certificate.upsert({
      where: { type_subjectId: { type: "CampaignBudgetSecured", subjectId: id } },
      update: {},
      create: {
        type: "CampaignBudgetSecured",
        title: "Campaign Budget Secured",
        campaignId: id,
        userId: input.buyerId,
        subjectId: id,
        status: "Confirmed",
        partiesJson: JSON.stringify(["VoiceTurk", "Buyer"]),
        summary: "Campaign budget was secured for contributor rewards and platform fees.",
      },
    });
    const buyer = await tx.user.findUniqueOrThrow({ where: { id: input.buyerId } });
    const proof = await createProof(tx, {
      type: "BUDGET_SECURED",
      subjectId: id,
      walletAddress: buyer.walletAddress,
      payload: { campaignId: id, buyerId: input.buyerId, amount: input.amount },
    });
    const linkedCertificate = await tx.certificate.update({
      where: { id: certificate.id },
      data: { proofRecordId: proof.id },
    });
    return { campaign, financeLedger, certificate: linkedCertificate };
  });

  return sendSuccess(res, {
    campaign: mapCampaign(result.campaign),
    financeLedger: mapFinanceLedger(result.financeLedger),
    certificate: mapCertificate(result.certificate),
  });
}));

campaignRouter.post("/:id/activate", asyncHandler(async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params);
  const input = parseInput(activateCampaignSchema, req.body);
  const existing = await getCampaign(id);
  if (existing.buyerId !== input.buyerId) throw new AppError(403, "FORBIDDEN", "Only the campaign buyer can activate it");
  const campaign = await prisma.campaign.update({ where: { id }, data: { status: "Active" }, include: campaignInclude });
  return sendSuccess(res, mapCampaign(campaign));
}));
