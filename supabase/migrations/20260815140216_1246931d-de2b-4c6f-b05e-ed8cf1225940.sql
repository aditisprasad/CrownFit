-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CONTESTANT PROFILES
CREATE TABLE public.contestant_profiles (
  user_id uuid PRIMARY KEY,
  full_name text,
  avatar_url text,
  date_of_birth date,
  gender text,
  city text,
  state text,
  nationality text,
  height_cm numeric,
  weight_kg numeric,
  bust_cm numeric,
  waist_cm numeric,
  hips_cm numeric,
  shoe_size text,
  dress_size text,
  hair_color text,
  eye_color text,
  languages text[] NOT NULL DEFAULT '{}',
  education text,
  experience text,
  skills text[] NOT NULL DEFAULT '{}',
  bio text,
  target_pageant text,
  target_year int,
  budget_band text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  resume_url text,
  comp_card_url text,
  public_slug text UNIQUE,
  is_public boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contestant_profiles TO authenticated;
GRANT ALL ON public.contestant_profiles TO service_role;
ALTER TABLE public.contestant_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.contestant_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_contestant_profiles_updated BEFORE UPDATE ON public.contestant_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ACHIEVEMENTS
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  issuer text,
  achieved_on date,
  description text,
  proof_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements" ON public.achievements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- COMPETITIONS
CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pageant_name text NOT NULL,
  year int,
  level text,
  result text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own competitions" ON public.competitions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PORTFOLIO
CREATE TABLE public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text,
  storage_path text,
  external_url text,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own portfolio" ON public.portfolio_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PREPARATION TASKS
CREATE TABLE public.preparation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stage text NOT NULL,
  title text NOT NULL,
  details text,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparation_tasks TO authenticated;
GRANT ALL ON public.preparation_tasks TO service_role;
ALTER TABLE public.preparation_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.preparation_tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BOOKINGS
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text,
  provider_name text,
  provider_id uuid,
  starts_at timestamptz,
  location text,
  booking_url text,
  contact text,
  status text NOT NULL DEFAULT 'planned',
  is_external boolean NOT NULL DEFAULT false,
  confirmation_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings" ON public.bookings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CALENDAR
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'personal',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  notes text,
  reminder_minutes int,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events" ON public.calendar_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_calendar_events_updated BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- MOOD / POSTURE / VOICE
CREATE TABLE public.mood_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'self_report',
  self_reported_mood text,
  journal_text text,
  estimated_state text,
  positivity numeric,
  stress numeric,
  energy numeric,
  confidence numeric,
  suggestions text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_records TO authenticated;
GRANT ALL ON public.mood_records TO service_role;
ALTER TABLE public.mood_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mood" ON public.mood_records FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.posture_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  posture_score numeric,
  shoulder_alignment numeric,
  head_position numeric,
  body_alignment numeric,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posture_records TO authenticated;
GRANT ALL ON public.posture_records TO service_role;
ALTER TABLE public.posture_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own posture" ON public.posture_records FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.voice_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  duration_seconds numeric,
  words_per_minute numeric,
  filler_word_count int,
  pause_count int,
  clarity numeric,
  modulation numeric,
  transcript text,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_records TO authenticated;
GRANT ALL ON public.voice_records TO service_role;
ALTER TABLE public.voice_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own voice" ON public.voice_records FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FITNESS
CREATE TABLE public.fitness_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity text NOT NULL,
  duration_minutes int,
  intensity text,
  logged_on date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_logs TO authenticated;
GRANT ALL ON public.fitness_logs TO service_role;
ALTER TABLE public.fitness_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fitness" ON public.fitness_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ANAIRA CHAT
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.chat_conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_chat_conversations_updated BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.chat_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);

-- MOCK JURY
CREATE TABLE public.interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mode text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  question_count int NOT NULL DEFAULT 0,
  final_score numeric,
  panel_evaluations jsonb,
  summary text,
  strengths text[],
  weaknesses text[],
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_sessions TO authenticated;
GRANT ALL ON public.interview_sessions TO service_role;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.interview_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.interview_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question_index int NOT NULL,
  question text NOT NULL,
  answer text,
  scores jsonb,
  overall_score numeric,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_answers TO authenticated;
GRANT ALL ON public.interview_answers TO service_role;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own answers" ON public.interview_answers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_interview_answers_session ON public.interview_answers(session_id, question_index);

-- READINESS + ML
CREATE TABLE public.readiness_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  readiness numeric,
  confidence numeric,
  consistency numeric,
  stage text,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_points int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.readiness_records TO authenticated;
GRANT ALL ON public.readiness_records TO service_role;
ALTER TABLE public.readiness_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own readiness" ON public.readiness_records FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ml_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model_name text NOT NULL,
  model_version text,
  target text NOT NULL,
  prediction numeric,
  features jsonb,
  feature_importance jsonb,
  metrics jsonb,
  training_samples int,
  trained_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ml_predictions TO authenticated;
GRANT ALL ON public.ml_predictions TO service_role;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own predictions" ON public.ml_predictions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SAVED ITEMS
CREATE TABLE public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  item_id uuid,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_items TO authenticated;
GRANT ALL ON public.saved_items TO service_role;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved" ON public.saved_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PAGEANTS (admin curated)
CREATE TABLE public.pageants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organizer text,
  category text,
  country text,
  state text,
  city text,
  status text NOT NULL DEFAULT 'announcement_pending',
  registration_open date,
  registration_close date,
  audition_date date,
  finale_date date,
  eligibility text,
  min_age int,
  max_age int,
  min_height_cm numeric,
  nationality_requirement text,
  marital_requirement text,
  education_requirement text,
  application_fee text,
  required_documents text[],
  official_url text,
  application_url text,
  source_url text,
  verified boolean NOT NULL DEFAULT false,
  last_verified timestamptz,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pageants TO authenticated;
GRANT ALL ON public.pageants TO service_role;
ALTER TABLE public.pageants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verified pageants readable" ON public.pageants FOR SELECT TO authenticated USING (verified = true);
CREATE POLICY "admins read all pageants" ON public.pageants FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins write pageants" ON public.pageants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pageants_updated BEFORE UPDATE ON public.pageants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROVIDERS (admin curated / sourced)
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  subcategories text[],
  address text,
  city text,
  state text,
  country text DEFAULT 'India',
  latitude numeric,
  longitude numeric,
  phone text,
  email text,
  website text,
  maps_url text,
  place_id text,
  instagram text,
  booking_url text,
  rating numeric,
  review_count int,
  price_band text,
  opening_hours jsonb,
  photo_url text,
  source text,
  source_url text,
  verified boolean NOT NULL DEFAULT false,
  last_verified timestamptz,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.providers TO authenticated;
GRANT ALL ON public.providers TO service_role;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verified providers readable" ON public.providers FOR SELECT TO authenticated USING (verified = true);
CREATE POLICY "admins read all providers" ON public.providers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins write providers" ON public.providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_providers_city_category ON public.providers(city, category);
CREATE TRIGGER trg_providers_updated BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- VERIFICATION LOGS
CREATE TABLE public.data_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  source_url text,
  verification_status text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.data_verification_logs TO authenticated;
GRANT ALL ON public.data_verification_logs TO service_role;
ALTER TABLE public.data_verification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read logs" ON public.data_verification_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert logs" ON public.data_verification_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- STORAGE POLICIES
CREATE POLICY "own portfolio files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own portfolio files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own portfolio files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own portfolio files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);