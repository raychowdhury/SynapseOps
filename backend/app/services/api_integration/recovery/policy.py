from dataclasses import dataclass


@dataclass
class RetryPolicy:
    max_attempts: int = 3
    base_delay_sec: float = 0.25
    max_delay_sec: float = 2.0


class RetryExhaustedError(RuntimeError):
    pass


def backoff_seconds(policy: RetryPolicy, attempt: int) -> float:
    delay = policy.base_delay_sec * (2 ** max(0, attempt - 1))
    return min(delay, policy.max_delay_sec)


def should_retry_status(status_code: int) -> bool:
    return status_code == 429 or status_code >= 500
