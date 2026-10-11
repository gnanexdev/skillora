ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS achievement_key varchar(240);

UPDATE public.achievements
SET achievement_key = 'legacy:' || id::text
WHERE achievement_key IS NULL;

ALTER TABLE public.achievements
  ALTER COLUMN achievement_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS achievements_user_achievement_key_uidx
  ON public.achievements (user_id, achievement_key);

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;