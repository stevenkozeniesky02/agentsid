"""Digest subscribe endpoint — collects emails for the weekly MCP Security Digest.

Same pattern as claims waitlist: validates email, appends to JSONL, emails admin.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.services.notifications import _send_email
from src.core.config import settings

router = APIRouter(prefix="/api/digest", tags=["digest"])
limiter = Limiter(key_func=get_remote_address)

_WRITE_LOCK = Lock()
_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_SUBS_PATH = _DATA_DIR / "digest-subscribers.jsonl"

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class SubscribeBody(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)


def _get_real_ip(request: Request) -> str:
    cf = request.headers.get("CF-Connecting-IP")
    if cf:
        return cf
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@dataclass(frozen=True)
class SubEntry:
    subscribed_at: str
    email: str
    ip: str


def _append(entry: SubEntry) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    line = json.dumps({
        "subscribed_at": entry.subscribed_at,
        "email": entry.email,
        "ip": entry.ip,
    })
    with _WRITE_LOCK:
        with _SUBS_PATH.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


@router.post("/subscribe")
@limiter.limit("5/hour")
async def subscribe(request: Request, body: SubscribeBody) -> dict:
    """Subscribe an email to the MCP Security Digest."""
    email = body.email.strip().lower()
    if not _EMAIL_RE.fullmatch(email):
        raise HTTPException(status_code=400, detail="Invalid email")

    entry = SubEntry(
        subscribed_at=datetime.now(timezone.utc).isoformat(),
        email=email,
        ip=_get_real_ip(request),
    )
    _append(entry)

    # Notify admin
    if settings.admin_email:
        try:
            _send_email(
                to=settings.admin_email,
                subject=f"Digest subscriber: {email}",
                html=f"""
                <h2>New digest subscriber</h2>
                <p><strong>{email}</strong> just subscribed to the MCP Security Digest.</p>
                <p style="color:#999;font-size:12px;">IP: {entry.ip} · {entry.subscribed_at}</p>
                """,
            )
        except Exception:
            pass

    return {
        "status": "subscribed",
        "message": "You're in. First issue lands Monday morning.",
    }
