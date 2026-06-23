import { z } from "zod";

const metric = z.number().int().min(1).max(5);

export const reviewSchema = z.object({
  buyerId: z.string().min(1),
  decision: z.enum(["Accept", "Request Retake", "Reject"]),
  rubric: z.object({
    audioClarity: metric,
    roleFit: metric,
    scenarioHandling: metric,
    conversationNaturalness: metric,
    brandSafety: metric,
  }).strict(),
  note: z.string().optional(),
}).strict();
