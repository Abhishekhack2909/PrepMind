"""
Auth Service — verifies Supabase JWTs so endpoints don't trust client-supplied IDs.

THE PROBLEM THIS SOLVES:
  Endpoints originally took `user_id` as a plain parameter:
      GET /api/analytics/summary?user_id=<uuid>
  The backend talks to Supabase with the SERVICE KEY, which bypasses Row Level
  Security. So anyone who knew (or guessed) a UUID could read or write another
  user's data straight off the public API.

  The fix: the client sends its Supabase access token, we verify it, and we take
  the user id FROM THE TOKEN. A caller can then only ever act as themselves,
  because forging a token requires Supabase's signing secret.

USAGE:
    # Strict — 401 if the token is missing/invalid:
    async def endpoint(user_id: str = Depends(require_user)): ...

    # Lenient — prefers the token, falls back to the query/body value:
    async def endpoint(user_id: str = Depends(resolve_user_id)): ...

MIGRATION NOTE:
  `resolve_user_id` exists so the API keeps working for clients that haven't been
  updated to send the token yet. Set `STRICT_AUTH=true` once every client sends
  one, and the fallback is refused.
"""

from __future__ import annotations

import os
from typing import Optional

from fastapi import Header, HTTPException, Query

STRICT_AUTH = os.getenv("STRICT_AUTH", "false").strip().lower() in ("1", "true", "yes", "on")

_supabase = None


def _get_supabase():
    global _supabase
    if _supabase is None:
        from supabase import create_client
        _supabase = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_KEY", ""),
        )
    return _supabase


def _user_id_from_token(token: str) -> Optional[str]:
    """Verify a Supabase access token and return its user id, or None if invalid.

    `auth.get_user(token)` asks Supabase to validate the signature and expiry —
    we deliberately don't decode the JWT locally, so an expired or tampered
    token can't slip through.
    """
    try:
        res = _get_supabase().auth.get_user(token)
        user = getattr(res, "user", None)
        return getattr(user, "id", None) if user else None
    except Exception as e:  # noqa: BLE001
        print(f"[WARN] token verification failed: {e}")
        return None


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return authorization.strip() or None


async def require_user(authorization: Optional[str] = Header(default=None)) -> str:
    """Strict dependency: a valid token is mandatory."""
    token = _extract_bearer(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization bearer token")
    user_id = _user_id_from_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


async def resolve_user_id(
    authorization: Optional[str] = Header(default=None),
    user_id: Optional[str] = Query(default=None),
) -> Optional[str]:
    """Lenient dependency for GET endpoints.

    Order of trust:
      1. A verified token (authoritative — can't be spoofed)
      2. The `user_id` query param (legacy; refused when STRICT_AUTH is on)
    """
    token = _extract_bearer(authorization)
    if token:
        verified = _user_id_from_token(token)
        if verified:
            return verified
        if STRICT_AUTH:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    if STRICT_AUTH:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


async def optional_user(authorization: Optional[str] = Header(default=None)) -> Optional[str]:
    """Returns the verified user id if a token was supplied, else None."""
    token = _extract_bearer(authorization)
    if not token:
        return None
    return _user_id_from_token(token)
