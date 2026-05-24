-- ============================================================
-- Migration 001 — Auth tables
-- ============================================================

CREATE TABLE public.users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  deleted_by   UUID REFERENCES public.users(id)
);

CREATE INDEX users_email_idx ON public.users (email) WHERE deleted_at IS NULL;

CREATE TABLE public.otp_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  otp_hash      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0
);

CREATE INDEX otp_sessions_email_idx ON public.otp_sessions (email);

CREATE TABLE public.sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id),
  token_hash     TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  revoked_at     TIMESTAMPTZ
);

CREATE INDEX sessions_token_hash_idx ON public.sessions (token_hash) WHERE revoked_at IS NULL;
CREATE INDEX sessions_user_id_idx   ON public.sessions (user_id);
