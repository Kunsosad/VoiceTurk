import { randomUUID } from "node:crypto";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../shared/AppError.js";
import { ensureRecordingsDirectory } from "./local-storage.service.js";

const extensionByMimeType: Readonly<Record<string, string>> = {
  "audio/webm": ".webm",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/ogg": ".ogg",
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, ensureRecordingsDirectory()),
  filename: (_req, file, callback) => {
    const extension = extensionByMimeType[file.mimetype];
    if (!extension) return callback(new AppError(400, "INVALID_AUDIO_TYPE", "Unsupported audio file type"), "");
    return callback(null, `${randomUUID()}${extension}`);
  },
});

export const uploadRecordingAudio = multer({
  storage,
  limits: { files: 1, fileSize: env.AUDIO_UPLOAD_MAX_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!extensionByMimeType[file.mimetype]) {
      callback(new AppError(400, "INVALID_AUDIO_TYPE", "Unsupported audio file type"));
      return;
    }
    callback(null, true);
  },
}).single("audio");
