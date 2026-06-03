-- TeachingApps baseline schema for ClassMap / ClassMap Studio

-- ── Core tables ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS class_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  level_label TEXT,
  context_type TEXT,
  profile_type TEXT,
  main_goal TEXT,
  notes TEXT,
  subject_type TEXT,
  subject_template_id TEXT,
  custom_subject_id UUID,
  subject_name TEXT,
  subject_category TEXT,
  competencies_json JSONB,
  observation_scale_json JSONB,
  group_templates_json JSONB,
  activity_library_json JSONB,
  report_labels_json JSONB,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_learners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  display_name TEXT,
  age INTEGER,
  profile_type TEXT,
  main_language TEXT,
  other_languages TEXT,
  initial_level_estimate TEXT,
  background_info TEXT,
  additional_context TEXT,
  initial_profile_label TEXT,
  confidence_observation TEXT,
  confidence_label TEXT,
  main_need TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  observation_date DATE,
  observation_type TEXT DEFAULT 'standard',
  focus TEXT,
  status TEXT DEFAULT 'draft',
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learner_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES class_learners(id) ON DELETE CASCADE,
  observation_id UUID NOT NULL REFERENCES class_observations(id) ON DELETE CASCADE,
  scores_json JSONB,
  tags_json JSONB,
  main_need TEXT,
  reliability_label TEXT,
  notes TEXT,
  instruction_comprehension TEXT,
  participation TEXT,
  oral_confidence TEXT,
  vocabulary TEXT,
  grammar_accuracy TEXT,
  written_production TEXT,
  comprehension TEXT,
  autonomy TEXT,
  error_reaction TEXT,
  oral_production TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS need_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  observation_id UUID REFERENCES class_observations(id) ON DELETE SET NULL,
  group_name TEXT NOT NULL,
  group_type TEXT,
  priority_skill TEXT,
  priority_competency_key TEXT,
  priority_competency_label TEXT,
  learner_ids_json TEXT,
  rationale TEXT,
  recommended_activity TEXT,
  activity_steps_json JSONB,
  difficulty_level TEXT,
  teacher_notes TEXT,
  status TEXT DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_map_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  observation_id UUID REFERENCES class_observations(id) ON DELETE SET NULL,
  class_summary TEXT,
  collective_priorities_json TEXT,
  need_groups_json TEXT,
  outlier_learners_json TEXT,
  learner_profiles_json JSONB,
  risks_json TEXT,
  subject_name TEXT,
  subject_category TEXT,
  competencies_snapshot_json JSONB,
  observation_scale_snapshot_json JSONB,
  recommended_session_plan_json JSONB,
  reliability_label TEXT,
  teacher_validated BOOLEAN DEFAULT false,
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  title TEXT,
  content_text TEXT,
  content_json TEXT,
  export_status TEXT DEFAULT 'ready',
  created_date TIMESTAMPTZ DEFAULT now(),
  updated_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subject_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  is_default_template BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active',
  observation_scale_json JSONB DEFAULT '[]'::jsonb,
  competencies_json JSONB DEFAULT '[]'::jsonb,
  group_templates_json JSONB DEFAULT '[]'::jsonb,
  activity_library_json JSONB DEFAULT '[]'::jsonb,
  report_labels_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'custom',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  base_template_id UUID REFERENCES subject_templates(id),
  observation_scale_json JSONB DEFAULT '[]'::jsonb,
  competencies_json JSONB DEFAULT '[]'::jsonb,
  group_templates_json JSONB DEFAULT '[]'::jsonb,
  activity_library_json JSONB DEFAULT '[]'::jsonb,
  report_labels_json JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE need_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_map_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_subjects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_owns_class(p_class_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM class_groups g
    WHERE g.id = p_class_id AND (g.created_by = auth.uid() OR g.created_by IS NULL)
  );
$$;

DROP POLICY IF EXISTS class_groups_own ON class_groups;
CREATE POLICY class_groups_own ON class_groups FOR ALL TO authenticated
  USING (created_by = auth.uid() OR created_by IS NULL)
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

DROP POLICY IF EXISTS class_learners_own ON class_learners;
CREATE POLICY class_learners_own ON class_learners FOR ALL TO authenticated
  USING (user_owns_class(class_id)) WITH CHECK (user_owns_class(class_id));

DROP POLICY IF EXISTS class_observations_own ON class_observations;
CREATE POLICY class_observations_own ON class_observations FOR ALL TO authenticated
  USING (user_owns_class(class_id)) WITH CHECK (user_owns_class(class_id));

DROP POLICY IF EXISTS learner_observations_own ON learner_observations;
CREATE POLICY learner_observations_own ON learner_observations FOR ALL TO authenticated
  USING (user_owns_class(class_id)) WITH CHECK (user_owns_class(class_id));

DROP POLICY IF EXISTS need_groups_own ON need_groups;
CREATE POLICY need_groups_own ON need_groups FOR ALL TO authenticated
  USING (user_owns_class(class_id)) WITH CHECK (user_owns_class(class_id));

DROP POLICY IF EXISTS class_map_results_own ON class_map_results;
CREATE POLICY class_map_results_own ON class_map_results FOR ALL TO authenticated
  USING (user_owns_class(class_id)) WITH CHECK (user_owns_class(class_id));

DROP POLICY IF EXISTS class_reports_own ON class_reports;
CREATE POLICY class_reports_own ON class_reports FOR ALL TO authenticated
  USING (user_owns_class(class_id)) WITH CHECK (user_owns_class(class_id));

DROP POLICY IF EXISTS subject_templates_read ON subject_templates;
CREATE POLICY subject_templates_read ON subject_templates FOR SELECT TO authenticated
  USING (is_default_template = true OR created_by = auth.uid());

DROP POLICY IF EXISTS custom_subjects_own ON custom_subjects;
CREATE POLICY custom_subjects_own ON custom_subjects FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Allow anon to read default templates only (optional, for pre-auth browse)
DROP POLICY IF EXISTS subject_templates_anon_read ON subject_templates;
CREATE POLICY subject_templates_anon_read ON subject_templates FOR SELECT TO anon
  USING (is_default_template = true);

INSERT INTO subject_templates (name, slug, description, icon, category, is_default_template, status)
VALUES
  ('FLE', 'fle', 'Français langue étrangère', 'Languages', 'languages', true, 'active'),
  ('Mathématiques', 'mathematics', 'Énoncés, calcul, méthode', 'Calculator', 'mathematics', true, 'active'),
  ('Informatique', 'computer_science', 'Logique, syntaxe, debugging', 'Code', 'computer_science', true, 'active'),
  ('Chant / voix', 'music', 'Justesse, rythme, respiration', 'Music', 'music', true, 'active'),
  ('Soutien scolaire général', 'general_support', 'Méthode, autonomie, confiance', 'BookOpen', 'general_support', true, 'active'),
  ('Sciences', 'sciences', 'Protocole, raisonnement, calcul', 'FlaskConical', 'sciences', true, 'active'),
  ('Modèle vide', 'custom_blank', 'Créez votre matière de zéro', 'Plus', 'custom', true, 'active')
ON CONFLICT (slug) DO NOTHING;
