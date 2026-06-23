export type ProofType = "BUDGET_SECURED" | "CONTRIBUTOR_CONSENT" | "RECORDING_ACCEPTED";

export type CreateProofInput = {
  type: ProofType;
  subjectId: string;
  walletAddress?: string | null;
  payload: Record<string, unknown>;
};
