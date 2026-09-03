-- Water logs
CREATE TABLE public.water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_ml integer NOT NULL,
  logged_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water" ON public.water_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Diet logs
CREATE TABLE public.diet_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meal text NOT NULL DEFAULT 'breakfast',
  description text NOT NULL,
  calories integer,
  notes text,
  logged_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_logs TO authenticated;
GRANT ALL ON public.diet_logs TO service_role;
ALTER TABLE public.diet_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own diet" ON public.diet_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Step logs
CREATE TABLE public.step_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  steps integer NOT NULL,
  logged_on date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.step_logs TO authenticated;
GRANT ALL ON public.step_logs TO service_role;
ALTER TABLE public.step_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own steps" ON public.step_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sleep logs
CREATE TABLE public.sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  logged_on date NOT NULL DEFAULT CURRENT_DATE,
  bedtime time,
  wake_time time,
  duration_hours numeric,
  quality integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sleep_logs TO authenticated;
GRANT ALL ON public.sleep_logs TO service_role;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sleep" ON public.sleep_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Preparation plans
CREATE TABLE public.preparation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_pageant text,
  target_date date,
  horizon_weeks integer,
  focus_areas text[] NOT NULL DEFAULT '{}',
  summary text,
  weeks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparation_plans TO authenticated;
GRANT ALL ON public.preparation_plans TO service_role;
ALTER TABLE public.preparation_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.preparation_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_preparation_plans_updated BEFORE UPDATE ON public.preparation_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Digital twin snapshots
CREATE TABLE public.digital_twin_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  readiness numeric,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_points integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_twin_snapshots TO authenticated;
GRANT ALL ON public.digital_twin_snapshots TO service_role;
ALTER TABLE public.digital_twin_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own twin" ON public.digital_twin_snapshots FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Portfolio extras
ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS credits text,
  ADD COLUMN IF NOT EXISTS description text;

-- Profile extras for personalization
ALTER TABLE public.contestant_profiles
  ADD COLUMN IF NOT EXISTS activity_level text,
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS dietary_preference text,
  ADD COLUMN IF NOT EXISTS food_allergies text,
  ADD COLUMN IF NOT EXISTS food_preferences text,
  ADD COLUMN IF NOT EXISTS skin_type text,
  ADD COLUMN IF NOT EXISTS skin_concerns text,
  ADD COLUMN IF NOT EXISTS hair_type text,
  ADD COLUMN IF NOT EXISTS hair_concerns text,
  ADD COLUMN IF NOT EXISTS fitness_preferences text,
  ADD COLUMN IF NOT EXISTS training_minutes_per_day integer,
  ADD COLUMN IF NOT EXISTS daily_schedule text,
  ADD COLUMN IF NOT EXISTS sleep_target_hours numeric,
  ADD COLUMN IF NOT EXISTS water_target_ml integer,
  ADD COLUMN IF NOT EXISTS step_target integer,
  ADD COLUMN IF NOT EXISTS preparation_level text,
  ADD COLUMN IF NOT EXISTS improvement_areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS pageant_category text,
  ADD COLUMN IF NOT EXISTS experience_level text;

-- Pageant/provider verification metadata (idempotent)
ALTER TABLE public.pageants ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified';
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified';