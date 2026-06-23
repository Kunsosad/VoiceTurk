# Solana proof adapter

Phase 4 is intentionally mock-only. The adapter creates deterministic database proof records using a canonical JSON payload and SHA-256 hash. It does not connect to an RPC endpoint, build or sign transactions, hold keys, or submit anything to Solana.

Use `SOLANA_MOCK_MODE=true`. Each proof is unique by `type` and `subjectId`; equivalent retries return the existing record, while a conflicting payload is rejected. The generated `proofRef` and `txSignature` are visibly mock values and must not be represented as on-chain transactions.

Fund, consent, and accepted-recording flows remain the source of truth. Proof creation is an atomic adapter side effect and never decides campaign status, review decisions, or payout eligibility.
