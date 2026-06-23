import { z } from "zod";

export const createConversationSessionSchema = z.object({
  campaignId: z.string().min(1),
  contributorId: z.string().min(1),
}).strict();
