import { Router } from "express";
import { AppError } from "../shared/AppError.js";
import { asyncHandler } from "../shared/asyncHandler.js";
import { sendSuccess } from "../shared/response.js";
import { uploadRecordingAudio } from "./upload.middleware.js";

export const storageRouter = Router();

storageRouter.post("/upload", uploadRecordingAudio, asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "AUDIO_FILE_REQUIRED", "Multipart field audio is required");
  return sendSuccess(res, {
    audioUrl: `/uploads/recordings/${req.file.filename}`,
    fileName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
}));
