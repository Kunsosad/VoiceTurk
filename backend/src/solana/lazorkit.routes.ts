import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../shared/asyncHandler.js";
import { mapProofRecord } from "../shared/mappers.js";
import { sendSuccess } from "../shared/response.js";
import { parseInput } from "../shared/validators.js";
import { createProof } from "./proof.service.js";

export const solanaRouter = Router();

const proofSchema = z.object({
  type: z.enum(["BUDGET_SECURED", "CONTRIBUTOR_CONSENT", "RECORDING_ACCEPTED"]),
  subjectId: z.string().min(1),
  walletAddress: z.string().min(1).optional(),
  payload: z.record(z.unknown()),
}).strict();

solanaRouter.post("/proof", asyncHandler(async (req, res) => {
  const input = parseInput(proofSchema, req.body);
  const proof = await prisma.$transaction((tx) => createProof(tx, input));
  return sendSuccess(res, mapProofRecord(proof));
}));
