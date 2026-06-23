import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { AppError } from "../shared/AppError.js";
import type { CreateProofInput } from "./proof.types.js";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicalize((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return value;
};

export const hashProofPayload = (payload: Record<string, unknown>) =>
  createHash("sha256").update(JSON.stringify(canonicalize(payload))).digest("hex");

export const createMockProof = async (tx: Prisma.TransactionClient, input: CreateProofInput) => {
  if (!env.SOLANA_MOCK_MODE) {
    throw new AppError(501, "SOLANA_MOCK_DISABLED", "Real Solana proof transactions are not implemented");
  }

  const payloadHash = hashProofPayload(input.payload);
  const existing = await tx.proofRecord.findUnique({
    where: { type_subjectId: { type: input.type, subjectId: input.subjectId } },
  });
  if (existing) {
    if (existing.payloadHash !== payloadHash || existing.walletAddress !== (input.walletAddress ?? null)) {
      throw new AppError(409, "PROOF_ALREADY_EXISTS", "A different proof already exists for this subject");
    }
    return existing;
  }

  return tx.proofRecord.create({
    data: {
      type: input.type,
      subjectId: input.subjectId,
      network: env.SOLANA_NETWORK,
      status: "Verified",
      walletAddress: input.walletAddress,
      proofRef: `${env.SOLANA_NETWORK}://VTK_${payloadHash.slice(0, 16)}`,
      txSignature: `mock_tx_${payloadHash.slice(0, 24)}`,
      payloadHash,
    },
  });
};
