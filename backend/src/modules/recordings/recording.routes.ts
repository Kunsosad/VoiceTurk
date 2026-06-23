import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { mapRecording } from "../../shared/mappers.js";
import { sendSuccess } from "../../shared/response.js";
import { idParamSchema, parseInput } from "../../shared/validators.js";
import { createRecordingSchema, recordingQuerySchema } from "./recording.schemas.js";

export const recordingRouter = Router();
export const campaignRecordingRouter = Router({ mergeParams: true });

const recordingInclude = { review: true } as const;

const listRecordings = async (where: { campaignId?: string; contributorId?: string; status?: string }) =>
  prisma.recording.findMany({ where, include: recordingInclude, orderBy: { createdAt: "desc" } });

recordingRouter.get("/", asyncHandler(async (req, res) => {
  const query = parseInput(recordingQuerySchema, req.query);
  return sendSuccess(res, (await listRecordings(query)).map(mapRecording));
}));

recordingRouter.post("/", asyncHandler(async (req, res) => {
  const input = parseInput(createRecordingSchema, req.body);
  const [campaign, contributor, session] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: input.campaignId } }),
    prisma.user.findUnique({ where: { id: input.contributorId } }),
    prisma.conversationSession.findUnique({ where: { id: input.sessionId } }),
  ]);
  if (!campaign) throw new AppError(404, "NOT_FOUND", "Campaign not found");
  if (!contributor || contributor.role !== "Contributor") throw new AppError(400, "INVALID_CONTRIBUTOR", "Contributor not found");
  if (!session || session.campaignId !== input.campaignId || session.contributorId !== input.contributorId) {
    throw new AppError(400, "INVALID_SESSION", "Conversation session does not match campaign and contributor");
  }

  const latest = await prisma.recording.aggregate({ where: { campaignId: input.campaignId }, _max: { recordingNumber: true } });
  const recording = await prisma.recording.create({
    data: {
      campaignId: input.campaignId,
      contributorId: input.contributorId,
      sessionId: input.sessionId,
      audioUrl: input.audioUrl,
      durationSeconds: input.durationSeconds,
      status: "Pending review",
      recordingNumber: (latest._max.recordingNumber ?? 0) + 1,
      contextSnapshot: `${campaign.context} · ${campaign.aiCustomerRole} · ${campaign.contributorRole}`,
      audioQualityJson: JSON.stringify(input.audioQuality),
    },
    include: recordingInclude,
  });
  return sendSuccess(res, mapRecording(recording), 201);
}));

recordingRouter.get("/:id", asyncHandler(async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params);
  const recording = await prisma.recording.findUnique({ where: { id }, include: recordingInclude });
  if (!recording) throw new AppError(404, "NOT_FOUND", "Recording not found");
  return sendSuccess(res, mapRecording(recording));
}));

campaignRecordingRouter.get("/:id/recordings", asyncHandler(async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params);
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { id: true } });
  if (!campaign) throw new AppError(404, "NOT_FOUND", "Campaign not found");
  return sendSuccess(res, (await listRecordings({ campaignId: id })).map(mapRecording));
}));
