from datetime import datetime, timedelta, timezone
import httpx
from app.services.api_integration.models import Credential


def _expired(expiry: datetime | None) -> bool:
    if expiry is None:
        return True
    return datetime.now(timezone.utc) >= expiry


class AuthManager:
    def __init__(self) -> None:
        self._token_cache: dict[str, tuple[str, datetime]] = {}

    async def build_headers(self, credential: Credential | None) -> dict[str, str]:
        if credential is None:
            return {}

        auth_type = credential.auth_type
        config = credential.auth_config or {}

        if auth_type == "api_key":
            header_name = config.get("header_name", "X-API-Key")
            api_key = config.get("api_key")
            if not api_key:
                raise ValueError("api_key credential is missing api_key")
            return {header_name: str(api_key)}

        if auth_type == "bearer_token":
            token = config.get("token")
            if not token:
                raise ValueError("bearer_token credential is missing token")
            return {"Authorization": f"Bearer {token}"}

        if auth_type == "oauth2_client_credentials":
            token = await self._oauth2_client_credentials(credential.id, config)
            return {"Authorization": f"Bearer {token}"}

        raise ValueError(f"Unsupported auth_type: {auth_type}")

    async def _oauth2_client_credentials(self, credential_id: str, config: dict) -> str:
        cached = self._token_cache.get(credential_id)
        if cached and not _expired(cached[1]):
            return cached[0]

        token_url = config.get("token_url")
        client_id = config.get("client_id")
        client_secret = config.get("client_secret")
        scope = config.get("scope")

        if not token_url or not client_id or not client_secret:
            raise ValueError("oauth2_client_credentials requires token_url, client_id, client_secret")

        payload = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        }
        if scope:
            payload["scope"] = scope

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.request("POST", token_url, data=payload)

        if response.status_code >= 400:
            raise ValueError(f"oauth2 token request failed with status {response.status_code}")

        token_data = response.json()
        access_token = token_data.get("access_token")
        expires_in = int(token_data.get("expires_in", 3600))

        if not access_token:
            raise ValueError("oauth2 token response missing access_token")

        expiry = datetime.now(timezone.utc) + timedelta(seconds=max(30, expires_in - 30))
        self._token_cache[credential_id] = (access_token, expiry)
        return access_token
