import pytest
import httpx


@pytest.mark.anyio
async def test_order_sync_flow(async_client, monkeypatch):
    original_request = httpx.AsyncClient.request
    captured: dict = {}

    async def patched_request(self, method, url, *args, **kwargs):
        url_str = str(url)
        if url_str.startswith("http://erp.test"):
            captured["method"] = method.upper()
            captured["url"] = url_str
            captured["json"] = kwargs.get("json")
            request = httpx.Request(method, url_str)
            return httpx.Response(status_code=200, json={"result": "ok"}, request=request)
        return await original_request(self, method, url, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "request", patched_request)

    shopify_order = {
        "id": "SO-1001",
        "total_price": "123.45",
        "currency": "USD",
        "shipping_address": {"city": "Seattle"},
        "line_items": [
            {"sku": "SKU-1", "quantity": "2", "price": "10.50"},
            {"sku": "SKU-2", "quantity": 1, "price": "5.00"},
        ],
    }

    create_response = await async_client.post(
        "/api/v1/api-integration/webhooks/shopify/orders-create",
        headers={"X-Shopify-Topic": "orders/create"},
        json=shopify_order,
    )

    assert create_response.status_code == 202
    body = create_response.json()
    assert body["status"] == "SUCCEEDED"
    run_id = body["run_id"]

    assert captured["method"] == "POST"
    assert captured["url"] == "http://erp.test/orders"
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

    run_response = await async_client.get(f"/api/v1/api-integration/ops/runs/{run_id}")
    assert run_response.status_code == 200
    run_body = run_response.json()
    assert run_body["status"] == "SUCCEEDED"
    assert run_body["mapped_payload"] == captured["json"]
