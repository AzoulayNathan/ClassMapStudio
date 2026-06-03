import { base44 } from "./base44Client";
import { getDefaultSubjectTemplates, subjectFromTemplate, competenciesFromLines, DEFAULT_OBSERVATION_SCALE, DEFAULT_REPORT_LABELS } from "@/lib/subject-templates";

export async function listTemplates() {
  try {
    const rows = await base44.entities.SubjectTemplate.filter({ status: "active", is_default_template: true });
    if (rows?.length) return rows;
  } catch {
    // Table may not exist yet — fall back to in-app templates
  }
  return getDefaultSubjectTemplates();
}

export async function getTemplate(slug) {
  try {
    const rows = await base44.entities.SubjectTemplate.filter({ slug, status: "active" });
    if (rows?.length) return rows[0];
  } catch { /* fallback */ }
  return getDefaultSubjectTemplates().find(t => t.slug === slug) || null;
}

export async function createCustomSubject({ name, description, category, competenciesText, createdBy, baseTemplateSlug }) {
  const base = baseTemplateSlug ? await getTemplate(baseTemplateSlug) : null;
  const competencies = competenciesText
    ? competenciesFromLines(competenciesText)
    : base?.competencies_json || competenciesFromLines("Compétence 1\nCompétence 2\nCompétence 3");

  const payload = {
    name,
    description: description || "",
    category: category || "custom",
    created_by: createdBy,
    base_template_id: base?.id || null,
    observation_scale_json: base?.observation_scale_json || DEFAULT_OBSERVATION_SCALE,
    competencies_json: competencies,
    group_templates_json: base?.group_templates_json || [],
    activity_library_json: base?.activity_library_json || [],
    report_labels_json: base?.report_labels_json || DEFAULT_REPORT_LABELS,
    status: "active",
  };

  try {
    return await base44.entities.CustomSubject.create(payload);
  } catch {
    return payload;
  }
}

export function templateToSubject(template) {
  return subjectFromTemplate(template);
}

export { getDefaultSubjectTemplates, subjectFromTemplate };
