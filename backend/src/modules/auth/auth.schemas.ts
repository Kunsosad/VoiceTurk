import { z } from "zod";

const roleSchema = z.enum(["Buyer", "Contributor"]);

export const demoLoginSchema = z.object({
  role: roleSchema,
  fullName: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
}).strict();

export const lazorkitLoginSchema = z.object({
  walletAddress: z.string().trim().min(1).optional(),
  smartWallet: z.string().trim().min(1).optional(),
  vaultPda: z.string().trim().min(1).optional(),
  fullName: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: roleSchema,
  authMethod: z.literal("lazorkit"),
}).strict().refine(
  (value) => Boolean(value.walletAddress ?? value.vaultPda),
  { message: "walletAddress or vaultPda is required", path: ["walletAddress"] },
);
