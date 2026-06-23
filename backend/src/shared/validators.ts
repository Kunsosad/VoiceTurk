import { z } from "zod";
import { AppError } from "./AppError.js";

export const parseInput = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", result.error.flatten());
  }
  return result.data;
};

export const idParamSchema = z.object({ id: z.string().min(1) });
