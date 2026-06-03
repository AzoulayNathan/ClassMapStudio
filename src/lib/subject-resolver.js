import { getDefaultSubjectTemplates, getTemplateBySlug, parseJsonField, subjectFromTemplate } from "./subject-templates";

export function resolveSubjectFromGroup(classGroup) {
  if (!classGroup) return null;

  const competencies = parseJsonField(classGroup.competencies_json, null);
  const observationScale = parseJsonField(classGroup.observation_scale_json, null);

  if (classGroup.subject_name && competencies?.length) {
    return {
      name: classGroup.subject_name,
      slug: classGroup.subject_slug || slugify(classGroup.subject_name),
      category: classGroup.subject_category || "custom",
      observation_scale: observationScale,
      competencies: competencies.filter(c => c.enabled !== false),
      group_templates: parseJsonField(classGroup.group_templates_json, []),
      activity_library: parseJsonField(classGroup.activity_library_json, []),
      report_labels: parseJsonField(classGroup.report_labels_json, {}),
      subject_type: classGroup.subject_type,
      subject_template_id: classGroup.subject_template_id,
      custom_subject_id: classGroup.custom_subject_id,
    };
  }

  if (classGroup.subject_template_id) {
    const tpl = getDefaultSubjectTemplates().find(t => t.slug === classGroup.subject_template_id)
      || getTemplateBySlug(classGroup.subject_template_id);
    if (tpl) return subjectFromTemplate(tpl);
  }

  return subjectFromTemplate(getTemplateBySlug("fle"));
}

export function ensureGroupSubjectDefaults(classGroup) {
  if (classGroup?.subject_name) return classGroup;
  const fle = getTemplateBySlug("fle");
  return {
    ...classGroup,
    subject_type: "template",
    subject_template_id: "fle",
    subject_name: fle.name,
    subject_category: fle.category,
    competencies_json: fle.competencies_json,
    observation_scale_json: fle.observation_scale_json,
    group_templates_json: fle.group_templates_json,
    activity_library_json: fle.activity_library_json || [],
    report_labels_json: fle.report_labels_json,
  };
}

export function buildGroupSubjectPayload(templateOrSubject, overrides = {}) {
  const isTemplate = templateOrSubject?.competencies_json != null;
  const subject = isTemplate ? subjectFromTemplate(templateOrSubject) : templateOrSubject;

  return {
    subject_type: overrides.subject_type || (isTemplate ? "template" : "custom"),
    subject_template_id: overrides.subject_template_id || subject.slug,
    custom_subject_id: overrides.custom_subject_id || null,
    subject_name: overrides.name || subject.name,
    subject_category: subject.category,
    competencies_json: overrides.competencies || subject.competencies,
    observation_scale_json: subject.observation_scale,
    group_templates_json: subject.group_templates,
    activity_library_json: subject.activity_library || [],
    report_labels_json: subject.report_labels,
    ...overrides,
  };
}

function slugify(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export { subjectFromTemplate, getTemplateBySlug, getDefaultSubjectTemplates };
