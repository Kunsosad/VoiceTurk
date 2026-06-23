import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { AppError } from "./AppError.js";
import { errorBody } from "./response.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(errorBody("NOT_FOUND", `Route ${req.method} ${req.path} not found`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json(errorBody(error.code, error.message, error.details));
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json(errorBody("INVALID_JSON", "Request body contains invalid JSON"));
    return;
  }

  if (error instanceof multer.MulterError) {
    const fileTooLarge = error.code === "LIMIT_FILE_SIZE";
    res.status(fileTooLarge ? 413 : 400).json(errorBody(
      fileTooLarge ? "FILE_TOO_LARGE" : "INVALID_UPLOAD",
      fileTooLarge ? "Audio file exceeds the configured size limit" : "Invalid multipart audio upload",
    ));
    return;
  }

  console.error(error);
  res.status(500).json(errorBody("INTERNAL_ERROR", "An unexpected error occurred"));
};
