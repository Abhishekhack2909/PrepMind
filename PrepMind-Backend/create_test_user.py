"""
Create (or reset) the PrepMind test account.

Run:  venv/Scripts/python.exe create_test_user.py

Uses the Supabase Admin API (service key), so it works even with email
confirmation enabled — the account is created pre-confirmed.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

TEST_EMAIL = "test@prepmind.app"
TEST_PASSWORD = "Test@1234"
TEST_NAME = "Test Aspirant"

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def main() -> None:
    # If the user already exists, reset the password instead of failing.
    existing = None
    try:
        page = supabase.auth.admin.list_users()
        users = page if isinstance(page, list) else getattr(page, "users", [])
        existing = next((u for u in users if u.email == TEST_EMAIL), None)
    except Exception as e:
        print(f"[WARN] Could not list users: {e}")

    if existing:
        supabase.auth.admin.update_user_by_id(
            existing.id,
            {"password": TEST_PASSWORD, "email_confirm": True},
        )
        user_id = existing.id
        print(f"Existing test user found — password reset. id={user_id}")
    else:
        res = supabase.auth.admin.create_user(
            {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "email_confirm": True,
                "user_metadata": {"name": TEST_NAME},
            }
        )
        user_id = res.user.id
        print(f"Test user created. id={user_id}")

    # Profile row (login.tsx expects a matching row in `users`)
    try:
        supabase.table("users").upsert(
            {
                "id": user_id,
                "email": TEST_EMAIL,
                "name": TEST_NAME,
                "daily_hours": 4,
            }
        ).execute()
        print("Profile row upserted into `users`.")
    except Exception as e:
        print(f"[WARN] Profile upsert failed (login still works): {e}")

    print()
    print("Login credentials:")
    print(f"  email:    {TEST_EMAIL}")
    print(f"  password: {TEST_PASSWORD}")


if __name__ == "__main__":
    main()
