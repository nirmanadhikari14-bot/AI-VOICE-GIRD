#!/usr/bin/env python3
"""
VoiceGuard AI — Safe Production Seeder
=======================================
Creates the minimum required data for a fresh production deployment:
  1. Default organization
  2. Super-admin user account

Safe to run multiple times (idempotent via ON CONFLICT DO NOTHING / upsert).

Usage:
  DATABASE_URL=postgresql+asyncpg://... python seed_production.py
  DATABASE_URL=sqlite+aiosqlite:///./voiceguard.db python seed_production.py

Environment variables:
  DATABASE_URL          — Required. SQLAlchemy async database URL.
  SUPER_ADMIN_EMAIL     — Optional. Defaults to admin@voiceguard.local
  SUPER_ADMIN_PASSWORD  — Optional. Defaults to a generated secure password
                          (printed once to stdout — save it immediately).
  ORG_NAME              — Optional. Defaults to "VoiceGuard Production".
"""
from __future__ import annotations

import asyncio
import os
import secrets
import string
import sys
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------
try:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text, select
except ImportError:
    print("ERROR: sqlalchemy[asyncio] is not installed.")
    print("Run: pip install sqlalchemy[asyncio] aiosqlite asyncpg")
    sys.exit(1)

try:
    import bcrypt
    def hash_password(plain: str) -> str:
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()
except ImportError:
    # Fallback using hashlib — NOT recommended for production
    import hashlib, base64
    print("WARNING: bcrypt not installed. Using SHA-256 fallback — install bcrypt for production.")
    def hash_password(plain: str) -> str:
        h = hashlib.sha256(plain.encode()).digest()
        return "sha256$" + base64.b64encode(h).decode()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_password(length: int = 20) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Seed logic
# ---------------------------------------------------------------------------

async def seed(engine, admin_email: str, admin_password: str, org_name: str) -> None:
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # ── 1. Upsert default organization ──────────────────────────────────
        result = await session.execute(
            text("SELECT id FROM organizations WHERE name = :name LIMIT 1"),
            {"name": org_name},
        )
        org_row = result.fetchone()

        if org_row:
            org_id = org_row[0]
            print(f"[skip] Organization '{org_name}' already exists (id={org_id})")
        else:
            import uuid
            org_id = str(uuid.uuid4())
            await session.execute(
                text(
                    "INSERT INTO organizations (id, name, created_at, is_active) "
                    "VALUES (:id, :name, :created_at, :is_active)"
                ),
                {
                    "id": org_id,
                    "name": org_name,
                    "created_at": _now(),
                    "is_active": True,
                },
            )
            print(f"[created] Organization '{org_name}' (id={org_id})")

        # ── 2. Upsert super-admin user ───────────────────────────────────────
        result = await session.execute(
            text("SELECT id FROM users WHERE email = :email LIMIT 1"),
            {"email": admin_email},
        )
        user_row = result.fetchone()

        if user_row:
            print(f"[skip] Super-admin '{admin_email}' already exists (id={user_row[0]})")
        else:
            import uuid
            user_id = str(uuid.uuid4())
            pw_hash = hash_password(admin_password)
            await session.execute(
                text(
                    "INSERT INTO users "
                    "(id, email, hashed_password, full_name, role, organization_id, "
                    " is_active, created_at) "
                    "VALUES (:id, :email, :hashed_password, :full_name, :role, :org_id, "
                    "        :is_active, :created_at)"
                ),
                {
                    "id": user_id,
                    "email": admin_email,
                    "hashed_password": pw_hash,
                    "full_name": "VoiceGuard Super Admin",
                    "role": "super_admin",
                    "org_id": org_id,
                    "is_active": True,
                    "created_at": _now(),
                },
            )
            print(f"[created] Super-admin '{admin_email}' (id={user_id})")

        await session.commit()
        print("\n[done] Production seed completed successfully.")


async def main() -> int:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL environment variable is not set.")
        return 1

    admin_email = os.getenv("SUPER_ADMIN_EMAIL", "admin@voiceguard.local")
    admin_password = os.getenv("SUPER_ADMIN_PASSWORD", "")
    generated = False

    if not admin_password:
        admin_password = _generate_password(24)
        generated = True
    else:
        # Validate strong password in production
        if len(admin_password) < 14:
            print("ERROR: In production, SUPER_ADMIN_PASSWORD must be at least 14 characters long.")
            return 1
        if admin_password in ["VoiceGuard2026!", "admin123", "password", "Admin@123"]:
            print("ERROR: Insecure default password rejected for production super-admin.")
            return 1

    org_name = os.getenv("ORG_NAME", "VoiceGuard Production")

    print("=" * 60)
    print("VoiceGuard AI — Production Seeder")
    print("=" * 60)
    print(f"Database : {db_url.split('@')[-1] if '@' in db_url else db_url}")
    print(f"Org name : {org_name}")
    print(f"Admin    : {admin_email}")
    if generated:
        print(f"Password : {admin_password}  ← SAVE THIS NOW")
    print()

    engine = create_async_engine(db_url, echo=False)

    try:
        await seed(engine, admin_email, admin_password, org_name)
    except Exception as exc:
        print(f"\nERROR during seeding: {exc}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        await engine.dispose()

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

