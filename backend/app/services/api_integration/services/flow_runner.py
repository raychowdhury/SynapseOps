from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.services.api_integration.models import Flow, Run, DeadLetter, Endpoint
from app.services.api_integration.services.mapping_engine import apply_mapping
from app.services.api_integration.services.auth_manager import AuthManager
from app.services.api_integration.connectors.rest_client import RestClient
from app.services.api_integration.recovery.policy import RetryPolicy
from app.services.api_integration.recovery.circuit import CircuitBreaker


_circuit_breaker = CircuitBreaker()
_auth_manager = AuthManager()
_rest_client = RestClient(_circuit_breaker)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class FlowRunner:
    async def run_by_event(self, db: Session, event_name: str, source_payload: dict, request_id: str) -> Run:
        flow = (
            db.query(Flow)
            .join(Endpoint, Flow.source_endpoint_id == Endpoint.id)
            .filter(Flow.is_enabled.is_(True), Endpoint.event_name == event_name, Endpoint.is_active.is_(True))
            .order_by(Flow.created_at.asc())
            .first()
        )
        if not flow:
            raise ValueError(f"No active flow found for event '{event_name}'")

        return await self.run_flow(db, flow, source_payload, request_id)

    async def run_by_id(self, db: Session, flow_id: str, source_payload: dict, request_id: str) -> Run:
        flow = db.query(Flow).filter(Flow.id == flow_id, Flow.is_enabled.is_(True)).first()
        if not flow:
            raise ValueError(f"Flow '{flow_id}' not found or disabled")
        if not flow.source_endpoint.is_active or not flow.target_endpoint.is_active:
            raise ValueError(f"Flow '{flow_id}' has inactive endpoints")

        return await self.run_flow(db, flow, source_payload, request_id)

    async def run_flow(self, db: Session, flow: Flow, source_payload: dict, request_id: str) -> Run:
        started = _now()
        run = Run(
            flow_id=flow.id,
            status="RUNNING",
            request_id=request_id,
            source_payload=source_payload,
            attempt_count=0,
            started_at=started,
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        mapped_payload: dict | None = None

        try:
            mapped_payload = apply_mapping(source_payload, flow.mapping.rules)
            run.mapped_payload = mapped_payload
            db.commit()

            headers = await _auth_manager.build_headers(flow.credential)
            retry_policy = RetryPolicy(
                max_attempts=max(1, flow.retry_max_attempts),
                base_delay_sec=max(0.01, flow.retry_base_delay_sec),
                max_delay_sec=max(0.01, flow.retry_max_delay_sec),
            )

            result = await _rest_client.request(
                endpoint=flow.target_endpoint,
                base_url=flow.target_endpoint.connector.base_url or "",
                payload=mapped_payload,
                headers=headers,
                retry_policy=retry_policy,
                failure_threshold=max(1, flow.circuit_failure_threshold),
                recovery_timeout_sec=max(0.1, flow.circuit_recovery_timeout_sec),
                request_id=request_id,
            )

            finished = _now()
            run.status = "SUCCEEDED"
            run.target_response = result.payload
            run.http_status = result.status_code
            run.attempt_count = result.attempt_count
            run.finished_at = finished
            run.duration_ms = int((finished - started).total_seconds() * 1000)
            db.commit()
            db.refresh(run)
            return run

        except Exception as exc:
            finished = _now()
            run.status = "FAILED"
            run.error_message = str(exc)
            run.finished_at = finished
            run.duration_ms = int((finished - started).total_seconds() * 1000)
            db.commit()
            db.refresh(run)

            dlq_entry = DeadLetter(
                flow_id=flow.id,
                run_id=run.id,
                source_payload=source_payload,
                mapped_payload=mapped_payload,
                error_message=str(exc),
                status="PENDING",
            )
            db.add(dlq_entry)
            db.commit()

            # Trigger SaaS Notification for system alert
            try:
                from app.services.notifications.services.bridge import notification_bridge
                notification_bridge.trigger_system_alert(
                    db, 
                    alert_type="integration_failure",
                    payload={
                        "title": f"Integration Failure: {flow.name}",
                        "body": f"Flow '{flow.name}' failed with error: {str(exc)}. Event moved to DLQ.",
                        "priority": "high",
                        "metadata": {
                            "flow_id": flow.id,
                            "run_id": run.id,
                            "error": str(exc)
                        }
                    }
                )
            except Exception as e:
                # Silently fail if notification bridge fails to avoid masking original error
                print(f"Failed to trigger notification: {e}")

            raise

    async def replay_dead_letter(self, db: Session, dead_letter: DeadLetter, request_id: str) -> Run:
        flow = db.query(Flow).filter(Flow.id == dead_letter.flow_id).first()
        if not flow:
            raise ValueError("Flow not found for dead letter")

        run = await self.run_flow(db, flow, dead_letter.source_payload, request_id)
        dead_letter.status = "REPLAYED"
        dead_letter.replay_count += 1
        dead_letter.last_replayed_at = _now()
        db.commit()
        return run


flow_runner = FlowRunner()
