import { Router } from "express";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { sendSuccess } from "../../shared/response.js";
import { idParamSchema, parseInput } from "../../shared/validators.js";
import { createConversationSessionSchema } from "./conversation.schemas.js";
import { createConversationSession, finishConversationSession, mapConversationSession } from "./conversation.service.js";

export const conversationRouter = Router();

conversationRouter.post("/sessions", asyncHandler(async (req, res) => {
  const input = parseInput(createConversationSessionSchema, req.body);
  const session = await createConversationSession(input.campaignId, input.contributorId);
  return sendSuccess(res, {
    sessionId: session.id,
    campaignId: session.campaignId,
    contributorId: session.contributorId,
    agoraChannel: session.agoraChannel,
    contributorRtcUid: session.contributorRtcUid,
    maxTurnsPerSide: session.maxTurnsPerSide,
    status: session.status,
  }, 201);
}));

conversationRouter.post("/sessions/:id/end", asyncHandler(async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params);
  return sendSuccess(res, mapConversationSession(await finishConversationSession(id)));
}));
