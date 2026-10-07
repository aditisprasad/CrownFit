CREATE TABLE public.posture_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'photo' CHECK (source IN ('photo','camera_live')),
  view text NOT NULL DEFAULT 'front' CHECK (view IN ('front','side')),
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  coaching jsonb NOT NULL DEFAULT '[]'::jsonb,
  frames_analyzed integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.posture_analyses TO authenticated;
GRANT ALL ON public.posture_analyses TO service_role;
ALTER TABLE public.posture_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own posture select" ON public.posture_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own posture insert" ON public.posture_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own posture delete" ON public.posture_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX posture_analyses_user_created ON public.posture_analyses (user_id, created_at DESC);
COMMENT ON TABLE public.posture_records IS 'DEPRECATED: replaced by posture_analyses (measurement-based)';