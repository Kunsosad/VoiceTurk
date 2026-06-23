import { z } from "zod";

export const campaignStatusSchema = z.enum(["Draft", "Active", "Reviewing", "Completed"]);

export const createCampaignSchema = z.object({
  buyerId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  context: z.string().min(1),
  aiCustomerRole: z.string().min(1),
  contributorRole: z.string().min(1),
  conversationBoundary: z.string().min(1),
  maxTurnsPerSide: z.number().int().positive(),
  targetAcceptedRecordings: z.number().int().positive(),
  rewardPerAcceptedRecording: z.number().int().nonnegative(),
}).strict();

export const updateCampaignSchema = createCampaignSchema
  .omit({ buyerId: true })
  .extend({ status: campaignStatusSchema.optional() })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one editable field is required");

export const fundCampaignSchema = z.object({
  buyerId: z.string().min(1),
  amount: z.number().int().positive(),
}).strict();

export const activateCampaignSchema = z.object({ buyerId: z.string().min(1) }).strict();

export const campaignQuerySchema = z.object({
  role: z.enum(["Buyer", "Contributor"]).optional(),
  buyerId: z.string().min(1).optional(),
  status: campaignStatusSchema.optional(),
});
