import { z } from "zod";

export const recordingStatusSchema = z.enum(["Pending review", "Accepted", "Retake requested", "Rejected"]);

export const audioQualitySchema = z.object({
  voiceDetected: z.boolean(),
  volumeOk: z.boolean(),
  silenceOk: z.boolean(),
  durationOk: z.boolean(),
}).strict();

export const createRecordingSchema = z.object({
  campaignId: z.string().min(1),
  contributorId: z.string().min(1),
  sessionId: z.string().min(1),
  audioUrl: z.string().min(1),
  durationSeconds: z.number().int().positive(),
  audioQuality: audioQualitySchema,
}).strict();

export const recordingQuerySchema = z.object({
  campaignId: z.string().min(1).optional(),
  contributorId: z.string().min(1).optional(),
  status: recordingStatusSchema.optional(),
});
