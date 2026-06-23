import { randomUUID } from "node:crypto";
import agoraToken from "agora-token";
import { env } from "../config/env.js";
import { AppError } from "../shared/AppError.js";
import type { AgoraTokenResult } from "./agora.types.js";

const { RtcRole, RtcTokenBuilder } = agoraToken;

export const createPublisherToken = (channelName: string, uid: number): AgoraTokenResult => {
  if (env.AGORA_MOCK_MODE) {
    return {
      appId: env.AGORA_APP_ID ?? "mock_agora_app_id",
      channelName,
      uid,
      token: `mock_rtc_token_${randomUUID()}`,
      expiresIn: env.AGORA_TOKEN_TTL_SECONDS,
    };
  }

  if (!env.AGORA_APP_ID || !env.AGORA_APP_CERTIFICATE) {
    throw new AppError(500, "AGORA_CONFIG_ERROR", "Agora credentials are not configured");
  }
  const token = RtcTokenBuilder.buildTokenWithUid(
    env.AGORA_APP_ID,
    env.AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    env.AGORA_TOKEN_TTL_SECONDS,
    env.AGORA_TOKEN_TTL_SECONDS,
  );
  return {
    appId: env.AGORA_APP_ID,
    channelName,
    uid,
    token,
    expiresIn: env.AGORA_TOKEN_TTL_SECONDS,
  };
};
