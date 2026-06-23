import type { Response } from "express";

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200) =>
  res.status(statusCode).json({ ok: true, data });

export const errorBody = (code: string, message: string, details?: unknown) => ({
  ok: false,
  error: details === undefined ? { code, message } : { code, message, details },
});
