import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const recordingsDirectory = fileURLToPath(new URL("../../uploads/recordings/", import.meta.url));

export const ensureRecordingsDirectory = () => {
  mkdirSync(recordingsDirectory, { recursive: true });
  return recordingsDirectory;
};
