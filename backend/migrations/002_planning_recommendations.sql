CREATE TABLE IF NOT EXISTS public.planning_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recommendation_key varchar(240) NOT NULL,
  recommendation_type varchar(40) NOT NULL
    CHECK (recommendation_type IN ('capacity_overload', 'life_event_conflict', 'overdue_task')),
  title varchar(200) NOT NULL,
  explanation text NOT NULL,
  reason text NOT NULL,
  week_start_date date NOT NULL,
  affected_date date,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  weekly_plan_id uuid REFERENCES public.weekly_plans(id) ON DELETE SET NULL,
  life_event_id uuid REFERENCES public.life_events(id) ON DELETE SET NULL,
  suggested_action jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolution jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  affected_week_end date,
  affected_task_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  status varchar(12) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'modified', 'ignored')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (user_id, recommendation_key)
);

ALTER TABLE public.planning_recommendations
  ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS affected_week_end date,
  ADD COLUMN IF NOT EXISTS affected_task_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[];

CREATE INDEX IF NOT EXISTS planning_recommendations_user_week_status_idx
  ON public.planning_recommendations (user_id, week_start_date, status);