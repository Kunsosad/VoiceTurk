import { randomUUID } from "node:crypto";
import type { ConversationSession } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/AppError.js";

const channelPart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);

const validateParticipants = async (campaignId: string, contributorId: string) => {
  const [campaign, contributor] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId } }),
    prisma.user.findUnique({ where: { id: contributorId } }),
  ]);
  if (!campaign) throw new AppError(404, "NOT_FOUND", "Campaign not found");
  if (!contributor || contributor.role !== "Contributor") {
    throw new AppError(400, "INVALID_CONTRIBUTOR", "Contributor not found");
  }
  return { campaign, contributor };
};

export const createConversationSession = async (campaignId: string, contributorId: string) => {
  const { campaign } = await validateParticipants(campaignId, contributorId);
  return prisma.$transaction(async (tx) => {
    const session = await tx.conversationSession.create({
      data: {
        campaignId,
        contributorId,
        agoraChannel: `voiceturk__pending__${randomUUID()}`,
        contributorRtcUid: env.AGORA_CONTRIBUTOR_UID,
        agentName: env.AGORA_AGENT_NAME,
        agentJoinMode: "manual",
        maxTurnsPerSide: campaign.maxTurnsPerSide,
        status: "Active",
      },
    });
    return tx.conversationSession.update({
      where: { id: session.id },
      data: { agoraChannel: `voiceturk__${channelPart(campaignId)}__${channelPart(session.id)}` },
    });
  });
};

export const getActiveSessionForStart = async (
  campaignId: string,
  contributorId: string,
  sessionId?: string,
) => {
  await validateParticipants(campaignId, contributorId);
  const session = sessionId
    ? await prisma.conversationSession.findUnique({ where: { id: sessionId } })
    : await prisma.conversationSession.findFirst({
        where: { campaignId, contributorId, status: "Active" },
        orderBy: { startedAt: "desc" },
      });

  if (!session) return createConversationSession(campaignId, contributorId);
  if (session.campaignId !== campaignId || session.contributorId !== contributorId) {
    throw new AppError(400, "SESSION_MISMATCH", "Session does not match campaign and contributor");
  }
  if (session.status !== "Active") {
    throw new AppError(409, "SESSION_NOT_ACTIVE", "Conversation session is not active");
  }
  return session;
};

export const finishConversationSession = async (sessionId: string) => {
  const session = await prisma.conversationSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError(404, "NOT_FOUND", "Conversation session not found");
  if (session.status === "Finished") return session;
  if (session.status !== "Active") {
    throw new AppError(409, "SESSION_NOT_ACTIVE", "Conversation session is not active");
  }
  return prisma.conversationSession.update({
    where: { id: sessionId },
    data: { status: "Finished", endedAt: new Date() },
  });
};

export const mapConversationSession = (session: ConversationSession) => ({
  id: session.id,
  campaignId: session.campaignId,
  contributorId: session.contributorId,
  agoraChannel: session.agoraChannel,
  contributorRtcUid: session.contributorRtcUid,
  agentName: session.agentName,
  agentJoinMode: session.agentJoinMode,
  maxTurnsPerSide: session.maxTurnsPerSide,
  status: session.status,
  startedAt: session.startedAt.toISOString(),
  endedAt: session.endedAt?.toISOString() ?? null,
});
