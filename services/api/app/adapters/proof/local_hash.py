from app.ports.providers import ProofProviderPort


class LocalHashProofAdapter(ProofProviderPort):
    def __init__(self) -> None:
        self.proofs: dict[str, str] = {}

    def issue_proof(self, dataset_version_id: str, manifest_hash: str) -> dict[str, str]:
        self.proofs[dataset_version_id] = manifest_hash
        return {"provider": "local_hash", "status": "VERIFIED", "signature": manifest_hash}

    def verify_proof(self, dataset_version_id: str, manifest_hash: str) -> bool:
        stored = self.proofs.get(dataset_version_id)
        return stored == manifest_hash if stored else bool(manifest_hash)
