import type { Prisma } from "@prisma/client";
import type { CreateProofInput } from "./proof.types.js";
import { createMockProof } from "./mock-proof.service.js";

export const createProof = (tx: Prisma.TransactionClient, input: CreateProofInput) =>
  createMockProof(tx, input);
