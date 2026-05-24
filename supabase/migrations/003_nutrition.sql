-- ============================================================
-- Migration 003 — Nutrition Tracker tables
-- ============================================================

CREATE TABLE public.user_profiles (
  user_id              UUID PRIMARY KEY REFERENCES public.users(id),
  goal                 TEXT,
  dietary_preference   TEXT,
  allergies            TEXT[],
  disliked_foods       TEXT[],
  age                  INT,
  weight_kg            NUMERIC,
  height_cm            NUMERIC,
  activity_level       TEXT,
  tdee                 NUMERIC,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.day_logs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES public.users(id),
  date                   DATE NOT NULL,
  goal_kcal              NUMERIC,
  consumed_kcal          NUMERIC,
  burned_kcal            NUMERIC,
  net_kcal               NUMERIC,
  balance                NUMERIC,
  steps                  INT,
  water_litres           NUMERIC,
  strength_duration_min  INT,
  strength_intensity     TEXT,
  ai_feedback            TEXT,
  feedback_generated_at  TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  deleted_by             UUID REFERENCES public.users(id),
  UNIQUE (user_id, date)
);

CREATE INDEX day_logs_user_date_idx ON public.day_logs (user_id, date) WHERE deleted_at IS NULL;

CREATE TABLE public.food_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_log_id    UUID NOT NULL REFERENCES public.day_logs(id),
  user_id       UUID NOT NULL REFERENCES public.users(id),
  parent_id     UUID REFERENCES public.food_items(id),
  slot          TEXT NOT NULL
                  CHECK (slot IN (
                    'breakfast', 'morning_snack', 'lunch',
                    'evening_snack', 'dinner', 'late_night'
                  )),
  name          TEXT NOT NULL,
  quantity_hint TEXT,
  kcal          NUMERIC,
  kcal_source   TEXT CHECK (kcal_source IN ('ai_estimated', 'user_override', 'computed_from_children')),
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID REFERENCES public.users(id)
);

CREATE INDEX food_items_day_log_id_idx ON public.food_items (day_log_id) WHERE deleted_at IS NULL;
CREATE INDEX food_items_parent_id_idx  ON public.food_items (parent_id)  WHERE deleted_at IS NULL;
