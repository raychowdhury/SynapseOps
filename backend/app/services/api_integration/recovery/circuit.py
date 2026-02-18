import time
from dataclasses import dataclass


class CircuitOpenError(RuntimeError):
    pass


@dataclass
class CircuitState:
    failure_count: int = 0
    opened_at: float | None = None
    state: str = "CLOSED"  # CLOSED | OPEN | HALF_OPEN


class CircuitBreaker:
    def __init__(self) -> None:
        self._states: dict[str, CircuitState] = {}

    def _get_state(self, key: str) -> CircuitState:
        if key not in self._states:
            self._states[key] = CircuitState()
        return self._states[key]

    def allow_request(self, key: str, recovery_timeout_sec: float) -> bool:
        state = self._get_state(key)
        if state.state != "OPEN":
            return True

        if state.opened_at is None:
            return False

        elapsed = time.monotonic() - state.opened_at
        if elapsed >= recovery_timeout_sec:
            state.state = "HALF_OPEN"
            return True
        return False

    def record_success(self, key: str) -> None:
        state = self._get_state(key)
        state.failure_count = 0
        state.opened_at = None
        state.state = "CLOSED"

    def record_failure(self, key: str, failure_threshold: int) -> None:
        state = self._get_state(key)
        state.failure_count += 1
        if state.failure_count >= failure_threshold:
            state.state = "OPEN"
            state.opened_at = time.monotonic()
