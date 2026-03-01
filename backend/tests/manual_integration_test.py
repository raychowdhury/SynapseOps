from app.database import SessionLocal
from app.services.api_integration.services.flow_runner import flow_runner
from app.services.api_integration.models import Flow
from app.services.notifications.models import Notification, Workflow
import uuid

def test_bridge_trigger():
    db = SessionLocal()
    try:
        # 1. Ensure the system workflow exists (seeded)
        workflow = db.query(Workflow).filter(Workflow.trigger_source == "system").first()
        if not workflow:
            print("System workflow not found. Seeding...")
            from app.services.notifications.seed import seed_notifications
            seed_notifications(db)
            workflow = db.query(Workflow).filter(Workflow.trigger_source == "system").first()
        
        print(f"Using workflow: {workflow.name} (ID: {workflow.id})")

        # 2. Get a flow to "run"
        flow = db.query(Flow).first()
        if not flow:
            print("No flows found. Seeding...")
            from app.services.api_integration.seed import seed_local_demo_flow
            seed_local_demo_flow(db)
            flow = db.query(Flow).first()
        
        print(f"Using flow: {flow.name} (ID: {flow.id})")

        # 3. Simulate a failure by calling run_flow with invalid payload or catching the expected raise
        print("Simulating flow failure...")
        request_id = str(uuid.uuid4())
        
        # We expect this to raise because we might pass something that fails mapping or delivery
        # But actually we just want to see if trigger_system_alert was called.
        # Let's count notifications before
        count_before = db.query(Notification).filter(Notification.workflow_id == workflow.id).count()
        
        try:
            # Pass something that will definitely fail (e.g. empty payload if mapping expects data)
            import asyncio
            asyncio.run(flow_runner.run_flow(db, flow, {"invalid": "data"}, request_id))
        except Exception as e:
            print(f"Flow failed as expected: {e}")
        
        # 4. Check if notification was created
        count_after = db.query(Notification).filter(Notification.workflow_id == workflow.id).count()
        
        if count_after > count_before:
            print(f"SUCCESS: Notification created! (Before: {count_before}, After: {count_after})")
            last_notif = db.query(Notification).filter(Notification.workflow_id == workflow.id).order_by(Notification.created_at.desc()).first()
            print(f"Last Notification Payload: {last_notif.payload}")
        else:
            print("FAILURE: No notification created.")
            
    finally:
        db.close()

if __name__ == "__main__":
    test_bridge_trigger()
