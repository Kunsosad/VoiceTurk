import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { mapCertificate } from "../../shared/mappers.js";
import { sendSuccess } from "../../shared/response.js";
import { idParamSchema, parseInput } from "../../shared/validators.js";
import { createProof } from "../../solana/proof.service.js";
import { agreementQuerySchema, consentSchema } from "./agreement.schemas.js";

export const agreementRouter = Router();
export const campaignConsentRouter = Router({ mergeParams: true });

type AgreementShape = {
  id: string;
  campaignId: string;
  contributorId: string;
  status: string;
  rewardRule: string;
  termsText: string;
  acceptedAt: Date | null;
  certificateId: string | null;
};

const mapAgreement = (agreement: AgreementShape) => ({
  id: agreement.id,
  campaignId: agreement.campaignId,
  contributorId: agreement.contributorId,
  status: agreement.status,
  rewardRule: agreement.rewardRule,
  termsText: agreement.termsText,
  acceptedAt: agreement.acceptedAt?.toISOString() ?? null,
  certificateId: agreement.certificateId,
});

agreementRouter.get("/", asyncHandler(async (req, res) => {
  const query = parseInput(agreementQuerySchema, req.query);
  const agreements = await prisma.contributorAgreement.findMany({
    where: query,
    orderBy: { acceptedAt: "desc" },
  });
  return sendSuccess(res, agreements.map(mapAgreement));
}));

campaignConsentRouter.post("/:id/consent", asyncHandler(async (req, res) => {
  const { id: campaignId } = parseInput(idParamSchema, req.params);
  const input = parseInput(consentSchema, req.body);
  const [campaign, contributor] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId }, include: { buyer: true } }),
    prisma.user.findUnique({ where: { id: input.contributorId } }),
  ]);
  if (!campaign) throw new AppError(404, "NOT_FOUND", "Campaign not found");
  if (!contributor || contributor.role !== "Contributor") {
    throw new AppError(400, "INVALID_CONTRIBUTOR", "Contributor not found");
  }

  const existing = await prisma.contributorAgreement.findUnique({
    where: { campaignId_contributorId: { campaignId, contributorId: input.contributorId } },
    include: { certificate: true },
  });
  if (existing) {
    if (!existing.certificate) throw new AppError(500, "INTERNAL_ERROR", "Agreement certificate is missing");
    const linkedCertificate = await prisma.$transaction(async (tx) => {
      const proof = await createProof(tx, {
        type: "CONTRIBUTOR_CONSENT",
        subjectId: existing.id,
        walletAddress: contributor.walletAddress,
        payload: {
          agreementId: existing.id,
          campaignId,
          contributorId: input.contributorId,
          status: existing.status,
        },
      });
      return tx.certificate.update({
        where: { id: existing.certificate!.id },
        data: { proofRecordId: proof.id },
      });
    });
    return sendSuccess(res, { agreement: mapAgreement(existing), certificate: mapCertificate(linkedCertificate) });
  }

  const result = await prisma.$transaction(async (tx) => {
    const agreement = await tx.contributorAgreement.create({
      data: {
        campaignId,
        contributorId: input.contributorId,
        status: "Accepted",
        rewardRule: "Only buyer-accepted recordings are paid.",
        termsText: "Contributor agrees to record for this campaign...",
        customDetails: input.customDetails,
        acceptedAt: new Date(),
      },
    });
    const certificate = await tx.certificate.create({
      data: {
        type: "ContributorAgreement",
        title: "Contributor Consent",
        campaignId,
        userId: input.contributorId,
        subjectId: agreement.id,
        status: "Verified",
        partiesJson: JSON.stringify([campaign.buyer.fullName, contributor.fullName, "VoiceTurk"]),
        summary: "Contributor accepted participation terms for this campaign.",
      },
    });
    const proof = await createProof(tx, {
      type: "CONTRIBUTOR_CONSENT",
      subjectId: agreement.id,
      walletAddress: contributor.walletAddress,
      payload: {
        agreementId: agreement.id,
        campaignId,
        contributorId: input.contributorId,
        status: agreement.status,
      },
    });
    const linkedCertificate = await tx.certificate.update({
      where: { id: certificate.id },
      data: { proofRecordId: proof.id },
    });
    const linkedAgreement = await tx.contributorAgreement.update({
      where: { id: agreement.id },
      data: { certificateId: certificate.id },
    });
    return { agreement: linkedAgreement, certificate: linkedCertificate };
  });

  return sendSuccess(res, {
    agreement: mapAgreement(result.agreement),
    certificate: mapCertificate(result.certificate),
  });
}));
