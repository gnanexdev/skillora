CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.daily_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  frequency varchar(20) NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  days_of_week smallint[] NOT NULL DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[],
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 1 AND 10080),
  category varchar(40) NOT NULL DEFAULT 'other',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  CHECK (cardinality(days_of_week) BETWEEN 1 AND 7),
  CHECK (days_of_week <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  CHECK (frequency <> 'daily' OR cardinality(days_of_week) = 7)
);

CREATE INDEX IF NOT EXISTS daily_routines_user_active_idx
  ON public.daily_routines (user_id, is_active, title);

CREATE TABLE IF NOT EXISTS public.routine_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL,
  user_id uuid NOT NULL,
  occurrence_date date NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (routine_id, occurrence_date),
  FOREIGN KEY (routine_id, user_id)
    REFERENCES public.daily_routines(id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS routine_occurrences_user_date_idx
  ON public.routine_occurrences (user_id, occurrence_date);

CREATE TABLE IF NOT EXISTS public.life_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  event_type varchar(20) NOT NULL DEFAULT 'other'
    CHECK (event_type IN ('exam', 'travel', 'family', 'college', 'event', 'holiday', 'personal', 'other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  impact_level varchar(10) NOT NULL DEFAULT 'medium'
    CHECK (impact_level IN ('low', 'medium', 'high')),
  estimated_daily_impact_minutes integer NOT NULL DEFAULT 180
    CHECK (estimated_daily_impact_minutes BETWEEN 0 AND 1440),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS life_events_user_dates_idx
  ON public.life_events (user_id, start_date, end_date);