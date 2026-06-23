import { z } from "zod";

export const agreementQuerySchema = z.object({ contributorId: z.string().min(1).optional() });

export const consentSchema = z.object({
  contributorId: z.string().min(1),
  customDetails: z.string().optional(),
}).strict();
