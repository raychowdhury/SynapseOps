import pytest
import httpx
from app.main import app


@pytest.fixture
def asgi_transport():
    return httpx.ASGITransport(app=app)


@pytest.fixture
async def async_client(asgi_transport):
    async with httpx.AsyncClient(transport=asgi_transport, base_url="http://testserver") as client:
        yield client
