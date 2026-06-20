from collections import deque
from threading import RLock

from app.ports.providers import JobQueuePort


class InProcessJobQueueAdapter(JobQueuePort):
    def __init__(self) -> None:
        self.jobs: deque[str] = deque()
        self.known: set[str] = set()
        self.lock = RLock()

    def enqueue(self, job_id: str) -> bool:
        with self.lock:
            if job_id in self.known:
                return False
            self.jobs.append(job_id)
            self.known.add(job_id)
            return True

    def pop(self) -> str | None:
        with self.lock:
            if not self.jobs:
                return None
            value = self.jobs.popleft()
            self.known.discard(value)
            return value

    def size(self) -> int:
        with self.lock:
            return len(self.jobs)
