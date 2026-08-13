# Security Policy

## Supported Versions

PrepMind is actively maintained. Security fixes are applied to the `main` branch only.

| Version | Supported |
|---------|-----------|
| main    | ✅ Yes    |

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public GitHub issue**.

Instead, report it privately via **GitHub's Security Advisories**:

1. Go to **Security → Advisories → New draft security advisory** in this repo.
2. Describe the vulnerability, its potential impact, and steps to reproduce.
3. We will acknowledge the report within **48 hours** and aim to release a fix within **7 days** for critical issues.

## Security Architecture

### Authentication
- All protected endpoints verify Supabase JWTs via `services/auth.py`.
- The backend never trusts a `user_id` supplied in the request body or query string for sensitive operations — the user identity is always derived from the verified token.
- The Supabase **service key** is used only server-side (backend). It is never exposed to the frontend.

### Database
- Supabase Row Level Security (RLS) is enabled on all user-owned tables.
- The backend uses the service key only to bypass RLS for operations the user already owns (verified by the JWT).

### Environment Variables
- All secrets (`GEMINI_API_KEY`, `GROQ_API_KEY`, `SUPABASE_SERVICE_KEY`, `DEEPGRAM_API_KEY`) are loaded from environment variables, never committed.
- See `.env.example` for the full list of required variables.

### Evaluation Quota
- The monthly evaluation limit (`FREE_MONTHLY_EVALUATIONS`) is enforced **server-side** in `routers/evaluate.py`. The client-side counter is informational only and cannot be relied upon for access control.

## Known Limitations

- `STRICT_AUTH=false` (the default) allows unauthenticated fallback on some read endpoints for backward compatibility. Set `STRICT_AUTH=true` in production once all clients send JWT tokens.
- The Render free tier does not support HTTPS termination at the app level — Render's proxy handles TLS. Do not expose the uvicorn port directly.
