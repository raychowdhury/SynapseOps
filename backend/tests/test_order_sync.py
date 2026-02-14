import pytest
import httpx


async def _get_demo_flow_id(async_client) -> str:
    flows_response = await async_client.get("/api/v1/api-integration/flows")
    assert flows_response.status_code == 200
    flows = flows_response.json()
    assert flows
    return flows[0]["id"]


def _shopify_order_payload() -> dict:
    return {
        "id": "SO-1001",
        "total_price": "123.45",
        "currency": "USD",
        "shipping_address": {"city": "Seattle"},
        "line_items": [
            {"sku": "SKU-1", "quantity": "2", "price": "10.50"},
            {"sku": "SKU-2", "quantity": 1, "price": "5.00"},
        ],
    }


@pytest.mark.anyio
async def test_order_sync_flow_via_webhook_flow_id(async_client, monkeypatch):
    original_request = httpx.AsyncClient.request
    captured: dict = {}

    async def patched_request(self, method, url, *args, **kwargs):
        url_str = str(url)
        if url_str.startswith("http://127.0.0.1:8000"):
            captured["method"] = method.upper()
            captured["url"] = url_str
            captured["json"] = kwargs.get("json")
            request = httpx.Request(method, url_str)
            return httpx.Response(status_code=200, json={"result": "ok"}, request=request)
        return await original_request(self, method, url, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "request", patched_request)

    flow_id = await _get_demo_flow_id(async_client)
    shopify_order = _shopify_order_payload()

    create_response = await async_client.post(
        f"/api/v1/api-integration/webhooks/{flow_id}",
        json=shopify_order,
    )

    assert create_response.status_code == 202
    body = create_response.json()
    assert body["status"] == "SUCCEEDED"
    run_id = body["run_id"]
    assert body["flow_id"] == flow_id

    assert captured["method"] == "POST"
    assert captured["url"] == "http://127.0.0.1:8000/api/v1/api-integration/mock/erp/orders"
    assert captured["json"] == {
        "order_number": "SO-1001",
        "total_amount": 123.45,
        "currency": "USD",
        "ship_city": "Seattle",
        "items": [
            {"sku": "SKU-1", "qty": 2, "unit_price": 10.5},
            {"sku": "SKU-2", "qty": 1, "unit_price": 5.0},
        ],
    }

    run_response = await async_client.get(f"/api/v1/api-integration/flows/{flow_id}/runs")
    assert run_response.status_code == 200
    run_items = run_response.json()
    run = next(item for item in run_items if item["id"] == run_id)
    assert run["status"] == "SUCCEEDED"


@pytest.mark.anyio
async def test_dead_letter_and_replay(async_client, monkeypatch):
    original_request = httpx.AsyncClient.request
    attempts = {"erp": 0}

    async def patched_request(self, method, url, *args, **kwargs):
        url_str = str(url)
        if url_str.startswith("http://127.0.0.1:8000"):
            attempts["erp"] += 1
            request = httpx.Request(method, url_str)
            if attempts["erp"] <= 3:
                return httpx.Response(status_code=500, json={"error": "temporary failure"}, request=request)
            return httpx.Response(status_code=200, json={"result": "ok"}, request=request)
        return await original_request(self, method, url, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "request", patched_request)

    flow_id = await _get_demo_flow_id(async_client)
    payload = _shopify_order_payload()

    before_dlq_response = await async_client.get("/api/v1/api-integration/dead-letters")
    assert before_dlq_response.status_code == 200
    before_ids = {item["id"] for item in before_dlq_response.json()}

    run_response = await async_client.post(f"/api/v1/api-integration/flows/{flow_id}/run", json=payload)
    assert run_response.status_code == 502

    dlq_response = await async_client.get("/api/v1/api-integration/dead-letters")
    assert dlq_response.status_code == 200
    dead_letters = dlq_response.json()
    new_items = [item for item in dead_letters if item["id"] not in before_ids and item["flow_id"] == flow_id]
    assert new_items

    from app.services.api_integration.services.flow_runner import _circuit_breaker

    _circuit_breaker._states.clear()

    dead_letter_id = new_items[0]["id"]
    replay_response = await async_client.post(f"/api/v1/api-integration/dead-letters/{dead_letter_id}/replay")
    assert replay_response.status_code == 200
    replay_body = replay_response.json()
    assert replay_body["status"] == "SUCCEEDED"
    assert replay_body["dead_letter_id"] == dead_letter_id

    updated_dlq_response = await async_client.get("/api/v1/api-integration/dead-letters")
    assert updated_dlq_response.status_code == 200
    updated_item = next(item for item in updated_dlq_response.json() if item["id"] == dead_letter_id)
    assert updated_item["status"] == "REPLAYED"
    assert updated_item["replay_count"] >= 1
