-- ============================================================
-- Migration 004 — Workout Exercises table
-- ============================================================

CREATE TABLE public.workout_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_log_id    UUID NOT NULL REFERENCES public.day_logs(id),
  user_id       UUID NOT NULL REFERENCES public.users(id),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'other',
  sets          INT,
  reps          INT,
  duration_min  INT,
  kcal_burned   NUMERIC,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID REFERENCES public.users(id)
);

CREATE INDEX workout_exercises_day_log_id_idx ON public.workout_exercises (day_log_id) WHERE deleted_at IS NULL;
