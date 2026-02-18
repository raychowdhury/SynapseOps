import asyncio
import json
import httpx
from pydantic import BaseModel
from app.services.api_integration.models import Endpoint
from app.services.api_integration.recovery.policy import RetryPolicy, backoff_seconds, should_retry_status, RetryExhaustedError
from app.services.api_integration.recovery.circuit import CircuitBreaker, CircuitOpenError


class RestCallResult(BaseModel):
    status_code: int
    payload: dict | str | None
    attempt_count: int


class RestClient:
    def __init__(self, circuit_breaker: CircuitBreaker) -> None:
        self._circuit = circuit_breaker

    async def request(
        self,
        endpoint: Endpoint,
        base_url: str,
        payload: dict,
        headers: dict[str, str],
        retry_policy: RetryPolicy,
        failure_threshold: int,
        recovery_timeout_sec: float,
        request_id: str,
    ) -> RestCallResult:
        url = f"{base_url.rstrip('/')}/{endpoint.path.lstrip('/')}"
        circuit_key = endpoint.id
        attempts = 0
        last_error: str | None = None

        for attempt in range(1, retry_policy.max_attempts + 1):
            attempts = attempt
            if not self._circuit.allow_request(circuit_key, recovery_timeout_sec):
                raise CircuitOpenError("Circuit is open")

            try:
                merged_headers = dict(headers)
                merged_headers["X-Request-Id"] = request_id

                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.request(
                        endpoint.method.upper(),
                        url,
                        json=payload,
                        headers=merged_headers,
                    )

                if response.status_code < 400:
                    self._circuit.record_success(circuit_key)
                    return RestCallResult(
                        status_code=response.status_code,
                        payload=_response_payload(response),
                        attempt_count=attempts,
                    )

                last_error = f"HTTP {response.status_code}"
                self._circuit.record_failure(circuit_key, failure_threshold)
                if not should_retry_status(response.status_code) or attempt == retry_policy.max_attempts:
                    break

            except Exception as exc:
                last_error = str(exc)
                self._circuit.record_failure(circuit_key, failure_threshold)
                if attempt == retry_policy.max_attempts:
                    break

            await asyncio.sleep(backoff_seconds(retry_policy, attempt))

        raise RetryExhaustedError(last_error or "Request failed")


def _response_payload(response: httpx.Response) -> dict | str | None:
    if not response.content:
        return None
    try:
        return response.json()
    except json.JSONDecodeError:
        return response.text
