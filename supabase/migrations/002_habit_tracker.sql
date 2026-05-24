-- ============================================================
-- Migration 002 — Habit / Challenge Tracker tables
-- ============================================================

CREATE TABLE public.challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id),
  name          TEXT NOT NULL,
  description   TEXT,
  start_date    DATE,
  duration_days INT,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paused', 'archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID REFERENCES public.users(id)
);

CREATE INDEX challenges_user_id_idx ON public.challenges (user_id) WHERE deleted_at IS NULL;

CREATE TABLE public.tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id),
  user_id      UUID NOT NULL REFERENCES public.users(id),
  parent_id    UUID REFERENCES public.tasks(id),
  title        TEXT NOT NULL,
  description  TEXT,
  output_type  TEXT NOT NULL
                 CHECK (output_type IN (
                   'yes_no', 'short_text', 'long_text', 'number',
                   'single_photo', 'multiple_photos',
                   'single_file', 'multiple_files'
                 )),
  required     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INT NOT NULL DEFAULT 0,
  depth        INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  deleted_by   UUID REFERENCES public.users(id)
);

CREATE INDEX tasks_challenge_id_idx ON public.tasks (challenge_id) WHERE deleted_at IS NULL;
CREATE INDEX tasks_parent_id_idx    ON public.tasks (parent_id)    WHERE deleted_at IS NULL;

CREATE TABLE public.daily_checkins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id),
  date         DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  deleted_by   UUID REFERENCES public.users(id),
  UNIQUE (user_id, challenge_id, date)
);

CREATE INDEX daily_checkins_user_date_idx ON public.daily_checkins (user_id, date) WHERE deleted_at IS NULL;

CREATE TABLE public.task_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id   UUID NOT NULL REFERENCES public.daily_checkins(id),
  task_id      UUID NOT NULL REFERENCES public.tasks(id),
  user_id      UUID NOT NULL REFERENCES public.users(id),
  date         DATE NOT NULL,
  value_bool   BOOLEAN,
  value_text   TEXT,
  value_number NUMERIC,
  value_files  JSONB,
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  deleted_by   UUID REFERENCES public.users(id),
  UNIQUE (checkin_id, task_id)
);

CREATE INDEX task_entries_checkin_id_idx ON public.task_entries (checkin_id) WHERE deleted_at IS NULL;
