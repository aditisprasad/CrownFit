CREATE TABLE public.skin_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_quality text NOT NULL,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  image_path text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skin_analyses TO authenticated;
GRANT ALL ON public.skin_analyses TO service_role;
ALTER TABLE public.skin_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own skin analyses select" ON public.skin_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own skin analyses insert" ON public.skin_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own skin analyses delete" ON public.skin_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX skin_analyses_user_idx ON public.skin_analyses(user_id, created_at DESC);

CREATE TABLE public.presentation_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confidence smallint NOT NULL CHECK (confidence BETWEEN 1 AND 10),
  preparedness smallint NOT NULL CHECK (preparedness BETWEEN 1 AND 10),
  camera_comfort smallint NOT NULL CHECK (camera_comfort BETWEEN 1 AND 10),
  improvement_goal text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.presentation_checkins TO authenticated;
GRANT ALL ON public.presentation_checkins TO service_role;
ALTER TABLE public.presentation_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins select" ON public.presentation_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own checkins insert" ON public.presentation_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own checkins delete" ON public.presentation_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX presentation_checkins_user_idx ON public.presentation_checkins(user_id, created_at DESC);

CREATE POLICY "own skin photos read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own skin photos insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own skin photos delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);