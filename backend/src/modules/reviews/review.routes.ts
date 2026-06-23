import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { mapCertificate, mapFinanceLedger, mapRecording, mapReview } from "../../shared/mappers.js";
import { sendSuccess } from "../../shared/response.js";
import { idParamSchema, parseInput } from "../../shared/validators.js";
import { createProof } from "../../solana/proof.service.js";
import { reviewSchema } from "./review.schemas.js";

export const reviewRouter = Router({ mergeParams: true });

const statusByDecision = {
  Accept: "Accepted",
  "Request Retake": "Retake requested",
  Reject: "Rejected",
} as const;

reviewRouter.post("/:id/review", asyncHandler(async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params);
  const input = parseInput(reviewSchema, req.body);
  const recording = await prisma.recording.findUnique({
    where: { id },
    include: { campaign: true, contributor: true, review: true },
  });
  if (!recording) throw new AppError(404, "NOT_FOUND", "Recording not found");
  if (recording.campaign.buyerId !== input.buyerId) {
    throw new AppError(403, "FORBIDDEN", "Only the campaign buyer can review this recording");
  }

  if (recording.review) {
    const isSameReview = recording.review.decision === input.decision
      && recording.review.audioClarity === input.rubric.audioClarity
      && recording.review.roleFit === input.rubric.roleFit
      && recording.review.scenarioHandling === input.rubric.scenarioHandling
      && recording.review.conversationNaturalness === input.rubric.conversationNaturalness
      && recording.review.brandSafety === input.rubric.brandSafety
      && recording.review.note === (input.note ?? null);
    if (!isSameReview) {
      throw new AppError(409, "REVIEW_ALREADY_EXISTS", "Recording has already been reviewed");
    }
    const financeLedger = await prisma.financeLedger.findUnique({ where: { recordingId: id } });
    let certificate = await prisma.certificate.findUnique({
      where: { type_subjectId: { type: "RecordingAccepted", subjectId: id } },
    });
    if (recording.review.decision === "Accept" && certificate) {
      certificate = await prisma.$transaction(async (tx) => {
        const proof = await createProof(tx, {
          type: "RECORDING_ACCEPTED",
          subjectId: id,
          walletAddress: recording.contributor.walletAddress,
          payload: {
            recordingId: id,
            campaignId: recording.campaignId,
            contributorId: recording.contributorId,
            buyerId: recording.review!.buyerId,
            decision: recording.review!.decision,
            totalScore: recording.review!.totalScore,
          },
        });
        return tx.certificate.update({ where: { id: certificate!.id }, data: { proofRecordId: proof.id } });
      });
    }
    const current = await prisma.recording.findUniqueOrThrow({ where: { id }, include: { review: true } });
    return sendSuccess(res, {
      recording: mapRecording(current),
      review: mapReview(recording.review),
      financeLedger: financeLedger ? mapFinanceLedger(financeLedger) : null,
      certificate: certificate ? mapCertificate(certificate) : null,
    });
  }

  const totalScore = Object.values(input.rubric).reduce((sum, value) => sum + value, 0);
  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        recordingId: id,
        buyerId: input.buyerId,
        decision: input.decision,
        ...input.rubric,
        totalScore,
        note: input.note,
      },
    });
    const updatedRecording = await tx.recording.update({
      where: { id },
      data: { status: statusByDecision[input.decision] },
      include: { review: true },
    });

    if (input.decision !== "Accept") {
      return { recording: updatedRecording, review, financeLedger: null, certificate: null };
    }

    const financeLedger = await tx.financeLedger.create({
      data: {
        type: "Contributor payout",
        status: "Completed",
        amount: recording.campaign.rewardPerAcceptedRecording,
        campaignId: recording.campaignId,
        userId: recording.contributorId,
        recordingId: id,
      },
    });
    const certificate = await tx.certificate.create({
      data: {
        type: "RecordingAccepted",
        title: "Recording Accepted",
        campaignId: recording.campaignId,
        userId: recording.contributorId,
        subjectId: id,
        status: "Confirmed",
        partiesJson: JSON.stringify([recording.campaign.name, recording.contributor.fullName, "VoiceTurk"]),
        summary: "Buyer accepted this customer-support conversation recording.",
      },
    });
    const proof = await createProof(tx, {
      type: "RECORDING_ACCEPTED",
      subjectId: id,
      walletAddress: recording.contributor.walletAddress,
      payload: {
        recordingId: id,
        campaignId: recording.campaignId,
        contributorId: recording.contributorId,
        buyerId: input.buyerId,
        decision: input.decision,
        totalScore,
      },
    });
    const linkedCertificate = await tx.certificate.update({
      where: { id: certificate.id },
      data: { proofRecordId: proof.id },
    });
    return { recording: updatedRecording, review, financeLedger, certificate: linkedCertificate };
  });

  return sendSuccess(res, {
    recording: mapRecording(result.recording),
    review: mapReview(result.review),
    financeLedger: result.financeLedger ? mapFinanceLedger(result.financeLedger) : null,
    certificate: result.certificate ? mapCertificate(result.certificate) : null,
  });
}));
