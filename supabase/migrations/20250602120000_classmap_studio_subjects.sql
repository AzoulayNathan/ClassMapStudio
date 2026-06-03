-- ClassMap Studio: subject templates + extended entities (additive migration)

-- New tables
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

-- Extend class_groups
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS subject_type TEXT;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS subject_template_id TEXT;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS custom_subject_id UUID;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS subject_category TEXT;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS competencies_json JSONB;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS observation_scale_json JSONB;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS group_templates_json JSONB;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS activity_library_json JSONB;
ALTER TABLE class_groups ADD COLUMN IF NOT EXISTS report_labels_json JSONB;

-- Extend class_learners
ALTER TABLE class_learners ADD COLUMN IF NOT EXISTS background_info TEXT;
ALTER TABLE class_learners ADD COLUMN IF NOT EXISTS additional_context TEXT;
ALTER TABLE class_learners ADD COLUMN IF NOT EXISTS initial_profile_label TEXT;
ALTER TABLE class_learners ADD COLUMN IF NOT EXISTS confidence_observation TEXT;

-- Extend learner_observations
ALTER TABLE learner_observations ADD COLUMN IF NOT EXISTS scores_json JSONB;
ALTER TABLE learner_observations ADD COLUMN IF NOT EXISTS tags_json JSONB;
ALTER TABLE learner_observations ADD COLUMN IF NOT EXISTS main_need TEXT;
ALTER TABLE learner_observations ADD COLUMN IF NOT EXISTS reliability_label TEXT;
ALTER TABLE learner_observations ADD COLUMN IF NOT EXISTS notes TEXT;

-- Extend need_groups
ALTER TABLE need_groups ADD COLUMN IF NOT EXISTS priority_competency_key TEXT;
ALTER TABLE need_groups ADD COLUMN IF NOT EXISTS priority_competency_label TEXT;
ALTER TABLE need_groups ADD COLUMN IF NOT EXISTS activity_steps_json JSONB;

-- Extend class_map_results
ALTER TABLE class_map_results ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE class_map_results ADD COLUMN IF NOT EXISTS subject_category TEXT;
ALTER TABLE class_map_results ADD COLUMN IF NOT EXISTS competencies_snapshot_json JSONB;
ALTER TABLE class_map_results ADD COLUMN IF NOT EXISTS observation_scale_snapshot_json JSONB;
ALTER TABLE class_map_results ADD COLUMN IF NOT EXISTS learner_profiles_json JSONB;
ALTER TABLE class_map_results ADD COLUMN IF NOT EXISTS recommended_session_plan_json JSONB;
ALTER TABLE class_map_results ADD COLUMN IF NOT EXISTS reliability_label TEXT;

-- RLS for subject_templates
ALTER TABLE subject_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subject_templates_read ON subject_templates;
CREATE POLICY subject_templates_read ON subject_templates
  FOR SELECT TO authenticated
  USING (is_default_template = true OR created_by = auth.uid());

DROP POLICY IF EXISTS custom_subjects_own ON custom_subjects;
CREATE POLICY custom_subjects_own ON custom_subjects
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Seed default templates (minimal — full data loaded from app on first use if empty)
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
