import json
import logging
from threading import Event, Thread

from app.application.service import VoiceTurkService

logger = logging.getLogger("voiceturk.pipeline")


class DeepCheckWorker:
    def __init__(self, service: VoiceTurkService, poll_interval_seconds: float, batch_size: int) -> None:
        self.service = service
        self.poll_interval_seconds = poll_interval_seconds
        self.batch_size = batch_size
        self.stop_event = Event()
        self.thread: Thread | None = None

    def start(self) -> None:
        if self.thread and self.thread.is_alive():
            return
        self.stop_event.clear()
        self.thread = Thread(target=self._run, name="deep-check-worker", daemon=True)
        self.thread.start()

    def stop(self) -> None:
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=max(1.0, self.poll_interval_seconds + 1.0))

    def run_once(self, source: str = "auto_worker") -> dict:
        return self.service.run_pending_deep_checks(self.batch_size, source=source)

    def _run(self) -> None:
        source = "recovery_scan"
        consecutive_errors = 0
        while not self.stop_event.is_set():
            try:
                result = self.run_once(source)
                logger.info(json.dumps({"event": "deepcheck_worker_poll", "source": source,
                    "processed": result["processed"], "recovered": result["recovered"],
                    "pending": result["pending"]}))
                consecutive_errors = 0
                source = "auto_worker"
            except Exception as exc:
                consecutive_errors += 1
                logger.exception(json.dumps({"event": "deepcheck_worker_error",
                    "error_type": type(exc).__name__, "consecutive_errors": consecutive_errors}))
            backoff = min(30.0, self.poll_interval_seconds * max(1, consecutive_errors))
            self.stop_event.wait(backoff)
