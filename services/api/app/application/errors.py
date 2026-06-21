from typing import Any


class RecordingFlowError(Exception):
    def __init__(self, status_code: int, code: str, message: str, message_vi: str,
                 action: str = "SYNC_SESSION", **details: Any) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.payload = {"action": action, "code": code, "error_code": code, "message": message,
            "message_vi": message_vi, "session_id": details.pop("session_id", None),
            "item_id": details.pop("item_id", None), "sample_id": details.pop("sample_id", None),
            "retry_same_item": details.pop("retry_same_item", False), "next_item": None,
            "debug": details.pop("debug", {}), **details}
