import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { mapCertificate } from "../../shared/mappers.js";
import { sendSuccess } from "../../shared/response.js";
import { idParamSchema, parseInput } from "../../shared/validators.js";

export const certificateRouter = Router();
const querySchema = z.object({ campaignId: z.string().min(1).optional(), userId: z.string().min(1).optional() });

certificateRouter.get("/", asyncHandler(async (req, res) => {
  const query = parseInput(querySchema, req.query);
  const certificates = await prisma.certificate.findMany({ where: query, orderBy: { createdAt: "desc" } });
  return sendSuccess(res, certificates.map(mapCertificate));
}));

certificateRouter.get("/:id", asyncHandler(async (req, res) => {
  const { id } = parseInput(idParamSchema, req.params);
  const certificate = await prisma.certificate.findUnique({ where: { id }, include: { proofRecord: true } });
  if (!certificate) throw new AppError(404, "NOT_FOUND", "Certificate not found");
  return sendSuccess(res, mapCertificate(certificate));
}));
