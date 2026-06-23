import { Router } from "express";
import { z } from "zod";
import {
  finishConversationSession,
  getActiveSessionForStart,
} from "../modules/conversations/conversation.service.js";
import { asyncHandler } from "../shared/asyncHandler.js";
import { sendSuccess } from "../shared/response.js";
import { parseInput } from "../shared/validators.js";
import { createPublisherToken } from "./agora.service.js";

export const agoraRouter = Router();

const tokenSchema = z.object({
  channelName: z.string().min(1),
  uid: z.number().int().positive(),
  role: z.literal("publisher"),
}).strict();

const startSchema = z.object({
  campaignId: z.string().min(1),
  contributorId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
}).strict();

const endSchema = z.object({ sessionId: z.string().min(1) }).strict();

agoraRouter.post("/token", asyncHandler(async (req, res) => {
  const input = parseInput(tokenSchema, req.body);
  return sendSuccess(res, createPublisherToken(input.channelName, input.uid));
}));

agoraRouter.post("/session/start", asyncHandler(async (req, res) => {
  const input = parseInput(startSchema, req.body);
  const session = await getActiveSessionForStart(input.campaignId, input.contributorId, input.sessionId);
  const rtc = createPublisherToken(session.agoraChannel, session.contributorRtcUid);
  return sendSuccess(res, {
    sessionId: session.id,
    campaignId: session.campaignId,
    channelName: session.agoraChannel,
    appId: rtc.appId,
    uid: session.contributorRtcUid,
    token: rtc.token,
    expiresIn: rtc.expiresIn,
    agentName: session.agentName,
    agentJoinMode: session.agentJoinMode,
    maxTurnsPerSide: session.maxTurnsPerSide,
    status: session.status,
  });
}));

agoraRouter.post("/session/end", asyncHandler(async (req, res) => {
  const input = parseInput(endSchema, req.body);
  const session = await finishConversationSession(input.sessionId);
  return sendSuccess(res, { sessionId: session.id, status: session.status });
}));
