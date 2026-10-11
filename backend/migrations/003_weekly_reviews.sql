CREATE TABLE IF NOT EXISTS public.weekly_review_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  went_well text NOT NULL DEFAULT '' CHECK (char_length(went_well) <= 2000),
  difficult text NOT NULL DEFAULT '' CHECK (char_length(difficult) <= 2000),
  learned text NOT NULL DEFAULT '' CHECK (char_length(learned) <= 2000),
  improve_next_week text NOT NULL DEFAULT '' CHECK (char_length(improve_next_week) <= 2000),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);