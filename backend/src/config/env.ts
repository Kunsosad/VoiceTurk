import "dotenv/config";
import { z } from "zod";

const optionalString = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(1).optional(),
);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  AUTH_DEMO_MODE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  JWT_EXPIRES_IN: z.string().min(1).default("1h"),
  AGORA_MOCK_MODE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  AGORA_APP_ID: optionalString,
  AGORA_APP_CERTIFICATE: optionalString,
  AGORA_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().max(86400).default(3600),
  AGORA_AGENT_NAME: z.string().min(1).default("VoiceTurk AI Customer"),
  AGORA_CONTRIBUTOR_UID: z.coerce.number().int().positive().default(1002),
  SOLANA_MOCK_MODE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  SOLANA_NETWORK: z.string().min(1).default("solana-devnet"),
  AUDIO_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().max(100 * 1024 * 1024).default(10 * 1024 * 1024),
}).superRefine((value, context) => {
  if (!value.AGORA_MOCK_MODE && !value.AGORA_APP_ID) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["AGORA_APP_ID"], message: "AGORA_APP_ID is required outside mock mode" });
  }
  if (!value.AGORA_MOCK_MODE && !value.AGORA_APP_CERTIFICATE) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["AGORA_APP_CERTIFICATE"], message: "AGORA_APP_CERTIFICATE is required outside mock mode" });
  }
});

export const env = envSchema.parse(process.env);
