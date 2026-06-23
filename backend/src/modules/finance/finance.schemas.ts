import { z } from "zod";

export const buyerFinanceQuerySchema = z.object({ buyerId: z.string().min(1).optional() });
export const contributorFinanceQuerySchema = z.object({ contributorId: z.string().min(1).optional() });
export const withdrawalSchema = z.object({
  contributorId: z.string().min(1),
  amount: z.number().int().positive(),
  walletAddress: z.string().min(1).optional(),
}).strict();
