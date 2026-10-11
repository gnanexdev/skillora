ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS college_or_university varchar(180),
  ADD COLUMN IF NOT EXISTS degree varchar(140),
  ADD COLUMN IF NOT EXISTS department varchar(140),
  ADD COLUMN IF NOT EXISTS study_year varchar(80),
  ADD COLUMN IF NOT EXISTS professional_role varchar(140),
  ADD COLUMN IF NOT EXISTS organization varchar(180),
  ADD COLUMN IF NOT EXISTS career_interests varchar(500),
  ADD COLUMN IF NOT EXISTS bio varchar(1200);