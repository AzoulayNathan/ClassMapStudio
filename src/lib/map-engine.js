import { DEFAULT_OBSERVATION_SCALE, parseJsonField } from "./subject-templates";

export { getDefaultSubjectTemplates, getTemplateBySlug } from "./subject-templates";

const LEGACY_FLE_KEYS = [
  "instruction_comprehension", "participation", "oral_confidence", "vocabulary",
  "grammar_accuracy", "written_production", "comprehension", "autonomy",
  "error_reaction", "oral_production",
];

export const TAG_META = {
  soutien_prioritaire: { label: "Soutien prioritaire", color: "bg-red-100 text-red-800 border-red-200" },
  besoin_comprehension: { label: "Compréhension à renforcer", color: "bg-rose-100 text-rose-800 border-rose-200" },
  methode_fragile: { label: "Méthode fragile", color: "bg-orange-100 text-orange-800 border-orange-200" },
  technique_fragile: { label: "Technique fragile", color: "bg-amber-100 text-amber-800 border-amber-200" },
  confiance_a_securiser: { label: "Confiance à sécuriser", color: "bg-amber-100 text-amber-800 border-amber-200" },
  autonomie_faible: { label: "Autonomie faible", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  production_fragile: { label: "Production fragile", color: "bg-purple-100 text-purple-800 border-purple-200" },
  profil_autonome: { label: "Profil autonome", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  profil_a_confirmer: { label: "Profil à confirmer", color: "bg-gray-100 text-gray-600 border-gray-200" },
  comprend_mais_parle_peu: { label: "Comprend mais produit peu", color: "bg-blue-100 text-blue-800 border-blue-200" },
  oral_a_securiser: { label: "Oral à sécuriser", color: "bg-amber-100 text-amber-800 border-amber-200" },
  besoin_consignes: { label: "Besoin consignes", color: "bg-rose-100 text-rose-800 border-rose-200" },
  vocabulaire_fonctionnel_faible: { label: "Vocabulaire faible", color: "bg-purple-100 text-purple-800 border-purple-200" },
  ecrit_fragile: { label: "Écrit fragile", color: "bg-orange-100 text-orange-800 border-orange-200" },
  grammaire_a_stabiliser: { label: "Grammaire à stabiliser", color: "bg-pink-100 text-pink-800 border-pink-200" },
  eleve_ressource: { label: "Apprenant ressource", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

export function getObservationScale(subject) {
  return subject?.observation_scale || DEFAULT_OBSERVATION_SCALE;
}

export function scaleLabelToKey(scale, label) {
  const item = scale.find(s => s.label === label);
  return item?.key || label;
}

export function getWeakLabels(scale) {
  const weak = scale.filter(s => s.score != null && s.score <= 2).map(s => s.label);
  return weak.length ? weak : ["fragile", "bloqué"];
}

export function getNotObservedLabel(scale) {
  return scale.find(s => s.score == null)?.label || "non observé";
}

export function getActiveCompetencies(subject, observationType = "standard") {
  const all = (subject?.competencies || []).filter(c => c.enabled !== false);
  const flag = observationType === "quick" ? "required_in_quick"
    : observationType === "complete" ? "required_in_complete"
    : "required_in_standard";
  const filtered = all.filter(c => c[flag]);
  return filtered.length ? filtered : all;
}

export function normalizeScores(learnerObs, competencies) {
  if (!learnerObs) return {};
  const parsed = parseJsonField(learnerObs.scores_json, null);
  if (parsed && typeof parsed === "object" && Object.keys(parsed).length) return parsed;

  const scores = {};
  const keys = competencies?.length
    ? competencies.map(c => c.key)
    : LEGACY_FLE_KEYS;

  keys.forEach(key => {
    if (learnerObs[key]) scores[key] = learnerObs[key];
  });
  return scores;
}

export function buildObsMap(learnerObservations, subject) {
  const competencies = subject?.competencies || [];
  const map = {};
  (learnerObservations || []).forEach(lo => {
    map[lo.learner_id] = normalizeScores(lo, competencies);
  });
  return map;
}

function isWeak(val, scale) {
  return getWeakLabels(scale).includes(val);
}

function isStrong(val, scale) {
  const item = scale.find(s => s.label === val);
  return item?.score != null && item.score >= 3;
}

export function computeTags(scores, subject) {
  const scale = getObservationScale(subject);
  const notObs = getNotObservedLabel(scale);
  const competencies = subject?.competencies || [];
  const isFle = subject?.slug === "fle" || subject?.category === "languages" && subject?.name === "FLE";

  if (!scores || !Object.keys(scores).length) {
    return { main: "profil_a_confirmer", secondary: [], reliability: "low" };
  }

  const activeKeys = competencies.map(c => c.key);
  const values = activeKeys.map(k => scores[k]).filter(Boolean);
  const unobserved = values.filter(v => v === notObs || !v).length + (activeKeys.length - values.length);

  if (unobserved >= Math.max(activeKeys.length - 2, 4)) {
    return { main: "profil_a_confirmer", secondary: [], reliability: "low" };
  }

  const tags = [];
  const weakCount = activeKeys.filter(k => isWeak(scores[k], scale)).length;

  if (weakCount >= 3) tags.push("soutien_prioritaire");

  competencies.forEach(c => {
    if (isWeak(scores[c.key], scale)) {
      if (c.category === "understanding") tags.push("besoin_comprehension");
      if (c.category === "method") tags.push("methode_fragile");
      if (c.category === "technique") tags.push("technique_fragile");
      if (c.category === "confidence") tags.push("confiance_a_securiser");
      if (c.category === "autonomy") tags.push("autonomie_faible");
      if (c.category === "production") tags.push("production_fragile");
    }
  });

  if (isFle) {
    if (isStrong(scores.comprehension, scale) && isWeak(scores.participation, scale) && isWeak(scores.oral_confidence, scale)) {
      tags.push("comprend_mais_parle_peu");
    }
    if (isWeak(scores.oral_confidence, scale) && isWeak(scores.error_reaction, scale) && isWeak(scores.participation, scale)) {
      tags.push("oral_a_securiser");
    }
    if (isWeak(scores.instruction_comprehension, scale)) tags.push("besoin_consignes");
    if (isWeak(scores.vocabulary, scale)) tags.push("vocabulaire_fonctionnel_faible");
    if (isWeak(scores.written_production, scale)) tags.push("ecrit_fragile");
    if (isWeak(scores.grammar_accuracy, scale)) tags.push("grammaire_a_stabiliser");
  }

  const solidCount = activeKeys.filter(k => isStrong(scores[k], scale)).length;
  if (isStrong(scores.autonomy, scale) && solidCount >= Math.ceil(activeKeys.length * 0.5)) {
    tags.push("profil_autonome");
  }
  if (unobserved >= 4) tags.push("profil_a_confirmer");

  const unique = [...new Set(tags)];
  const main = unique[0] || "profil_a_confirmer";
  const secondary = unique.slice(1, 4);
  const reliability = unobserved <= 2 ? "high" : unobserved <= 5 ? "medium" : "low";
  return { main, secondary, reliability };
}

export function computeLearnerProfile(learner, observation, subject) {
  const scores = normalizeScores(observation, subject?.competencies);
  const tags = computeTags(scores, subject);
  return { learner_id: learner.id, name: learner.first_name || learner.display_name, ...tags, scores };
}

export function computeCollectivePriorities(learners, obsMap, subject) {
  if (!learners.length) return [];
  const scale = getObservationScale(subject);
  const notObs = getNotObservedLabel(scale);
  const competencies = getActiveCompetencies(subject, "complete");
  const total = learners.length;

  return competencies.map(c => {
    const dist = {};
    scale.forEach(s => { dist[s.label] = 0; });
    learners.forEach(l => {
      const val = obsMap[l.id]?.[c.key] || notObs;
      dist[val] = (dist[val] || 0) + 1;
    });
    const weakCount = getWeakLabels(scale).reduce((n, label) => n + (dist[label] || 0), 0);
    const weakPct = weakCount / total;
    const priority = weakPct >= 0.4 ? "forte" : weakPct >= 0.25 ? "moyenne" : "faible";
    return {
      ...c,
      short: c.short_label,
      dist,
      weakCount,
      weakPct,
      priority,
      risk: `Des apprenants sont fragiles en ${c.label.toLowerCase()}.`,
      action: `Prévoir un temps ciblé sur ${c.label.toLowerCase()}.`,
    };
  }).sort((a, b) => b.weakPct - a.weakPct);
}

export function computeAlerts(learners, obsMap, subject) {
  const scale = getObservationScale(subject);
  const notObs = getNotObservedLabel(scale);
  const competencies = subject?.competencies || [];
  const alerts = [];

  learners.forEach(l => {
    const scores = obsMap[l.id];
    if (!scores || !Object.keys(scores).length) {
      alerts.push({
        learner: l, type: "données_insuffisantes", label: "Données insuffisantes", icon: "❓",
        action: "Observer cet apprenant dès la prochaine séance.",
      });
      return;
    }

    const unobserved = competencies.filter(c => !scores[c.key] || scores[c.key] === notObs).length;
    if (unobserved >= Math.ceil(competencies.length * 0.6)) {
      alerts.push({
        learner: l, type: "données_insuffisantes", label: "Données insuffisantes", icon: "❓",
        action: `${unobserved} critères non observés. Compléter l'observation.`,
      });
    }

    const weakFields = competencies.filter(c => isWeak(scores[c.key], scale)).map(c => c.short_label);
    if (weakFields.length >= 3) {
      alerts.push({
        learner: l, type: "soutien_prioritaire", label: "Soutien prioritaire", icon: "🔴",
        action: `Fragile/bloqué en : ${weakFields.slice(0, 4).join(", ")}.`,
      });
    }

    const confComp = competencies.find(c => c.category === "confidence");
    const prodComp = competencies.find(c => c.category === "production");
    if (confComp && prodComp && isWeak(scores[confComp.key], scale) && isWeak(scores[prodComp.key], scale)) {
      alerts.push({
        learner: l, type: "confiance_basse", label: "Confiance basse", icon: "🔇",
        action: "Créer un espace sécurisé pour la production.",
      });
    }

    const autoComp = competencies.find(c => c.key === "autonomy" || c.category === "autonomy");
    if (autoComp && isWeak(scores[autoComp.key], scale)) {
      alerts.push({
        learner: l, type: "autonomie_faible", label: "Autonomie faible", icon: "🧩",
        action: "Proposer une fiche-guide avec étapes numérotées.",
      });
    }

    const solidCount = competencies.filter(c => isStrong(scores[c.key], scale)).length;
    if (solidCount >= Math.ceil(competencies.length * 0.6) && autoComp && isStrong(scores[autoComp.key], scale)) {
      alerts.push({
        learner: l, type: "eleve_ressource", label: "Apprenant ressource", icon: "⭐",
        action: "Proposer un rôle de pair aidant ou activité défi.",
      });
    }
  });

  return alerts;
}

export function computeReliability(learners, obsMap, subject) {
  if (learners.length === 0) return { label: "à compléter", score: 0, pct: 0 };
  const notObs = getNotObservedLabel(getObservationScale(subject));
  const keyCriteria = getActiveCompetencies(subject, "standard").map(c => c.key);
  let filled = 0;
  const total = learners.length * keyCriteria.length;
  learners.forEach(l => {
    const obs = obsMap[l.id] || {};
    keyCriteria.forEach(k => { if (obs[k] && obs[k] !== notObs) filled++; });
  });
  const score = total > 0 ? filled / total : 0;
  const label = score >= 0.8 ? "carte solide" : score >= 0.6 ? "assez fiable" : score >= 0.35 ? "carte partielle" : "à compléter";
  return { label, score, pct: Math.round(score * 100) };
}

function splitIfNeeded(groups, template, memberIds, maxSize = 6) {
  const unique = [...new Set(memberIds)];
  if (unique.length === 0) return;
  const limit = template.max_size || maxSize;
  if (unique.length > limit) {
    const half = Math.ceil(unique.length / 2);
    groups.push({ ...template, memberIds: unique.slice(0, half), name: template.name + " A" });
    groups.push({ ...template, memberIds: unique.slice(half), name: template.name + " B" });
  } else {
    groups.push({ ...template, memberIds: unique });
  }
}

export function generateNeedGroups(learners, obsMap, subject, maxGroupSize = 6) {
  const scale = getObservationScale(subject);
  const groups = [];
  const templates = subject?.group_templates || [];

  templates.forEach(tpl => {
    const triggers = tpl.trigger_competencies || [];
    const memberIds = learners.filter(l =>
      triggers.some(key => isWeak(obsMap[l.id]?.[key], scale))
    ).map(l => l.id);

    splitIfNeeded(groups, {
      type: tpl.key,
      name: tpl.name,
      priority: tpl.priority || "moyenne",
      activity: tpl.activity,
      duration: tpl.duration || "15–20 min",
      success: tpl.success_indicator || "",
      teacherNote: tpl.teacher_note || "",
      risk: tpl.risk || "",
      action: tpl.action || tpl.activity || "",
      memberIds: [],
    }, memberIds, tpl.max_size || maxGroupSize);
  });

  if (groups.length === 0) {
    const priorities = computeCollectivePriorities(learners, obsMap, subject);
    priorities.filter(p => p.priority !== "faible").slice(0, 4).forEach(p => {
      const memberIds = learners.filter(l => isWeak(obsMap[l.id]?.[p.key], scale)).map(l => l.id);
      splitIfNeeded(groups, {
        type: p.key,
        name: `Groupe ${p.label}`,
        priority: p.priority === "forte" ? "haute" : "moyenne",
        activity: p.action,
        duration: "15–20 min",
        success: `Progrès visible en ${p.label.toLowerCase()}.`,
        teacherNote: "",
        risk: p.risk,
        action: p.action,
        memberIds: [],
      }, memberIds, maxGroupSize);
    });
  }

  return groups;
}

export function buildClassMapResult(classGroup, subject, learners, learnerObservations) {
  const obsMap = buildObsMap(learnerObservations, subject);
  const priorities = computeCollectivePriorities(learners, obsMap, subject);
  const alerts = computeAlerts(learners, obsMap, subject);
  const reliability = computeReliability(learners, obsMap, subject);
  const learner_profiles = learners.map(l => computeLearnerProfile(l, { scores_json: obsMap[l.id] }, subject));
  const recommended_groups = generateNeedGroups(learners, obsMap, subject);
  const highPriorities = priorities.filter(p => p.priority === "forte");
  const medPriorities = priorities.filter(p => p.priority === "moyenne");
  const watchList = alerts.filter(a => a.type !== "eleve_ressource");
  const resources = alerts.filter(a => a.type === "eleve_ressource");
  const labels = subject?.report_labels || {};
  const groupWord = labels.group || "groupe";

  const parts = [];
  if (learners.length > 0) {
    parts.push(`Ce ${groupWord} compte ${learners.length} apprenant${learners.length > 1 ? "s" : ""}.`);
  }
  if (subject?.name) parts.push(`Matière : ${subject.name}.`);
  if (highPriorities.length > 0) {
    parts.push(`Priorité forte : ${highPriorities.slice(0, 2).map(p => p.label).join(", ")}.`);
  }
  if (medPriorities.length > 0) {
    parts.push(`Priorité moyenne : ${medPriorities.slice(0, 2).map(p => p.label).join(", ")}.`);
  }
  if (watchList.length > 0) {
    parts.push(`${watchList.length} apprenant${watchList.length > 1 ? "s nécessitent" : " nécessite"} une attention particulière.`);
  }
  if (resources.length > 0) {
    parts.push(`Apprenant${resources.length > 1 ? "s ressources" : " ressource"} : ${resources.map(r => r.learner.first_name).join(", ")}.`);
  }
  if (recommended_groups.length > 0) {
    parts.push(`${recommended_groups.length} groupe${recommended_groups.length > 1 ? "s" : ""} de besoin recommandé${recommended_groups.length > 1 ? "s" : ""}.`);
  }

  const risks = highPriorities.slice(0, 4).map(p => `${p.label.toLowerCase()} fragile`);
  const unobservedLearners = learners.filter(l => !obsMap[l.id] || !Object.keys(obsMap[l.id]).length);
  if (unobservedLearners.length > learners.length * 0.3) risks.push("données insuffisantes");

  return {
    class_summary: parts.join(" "),
    priorities,
    alerts,
    learner_profiles,
    recommended_groups,
    risks,
    reliability_label: reliability.label,
    reliability_pct: reliability.pct,
    reliability_score: reliability.score,
    subject_name: subject?.name,
    subject_category: subject?.category,
  };
}

export function generateSessionPlan(classMapResult, groups, subject) {
  const labels = subject?.report_labels || {};
  const sessionLabel = labels.session || "séance";
  return {
    title: `Plan de ${sessionLabel}`,
    objective: classMapResult?.class_summary || "",
    duration: "45 min",
    warm_up: labels.warm_up || "Démarrage collectif",
    group_work: (groups || []).map(g => ({
      name: g.name || g.group_name,
      activity: g.activity || g.recommended_activity,
      members: g.memberIds?.length || 0,
    })),
    debrief: labels.debrief || "Mise en commun",
    final_activity: labels.final_activity || "Trace / production finale",
    observe_next: classMapResult?.priorities?.slice(0, 3).map(p => p.label) || [],
  };
}

export function computeClassWorkflow(classGroup, subject, learners, observations, mapResult, groups, reports) {
  const hasLearners = learners.length > 0;
  const completedObs = observations.filter(o => o.status === "completed");
  const draftObs = observations.filter(o => o.status === "draft");
  const hasCompletedObs = completedObs.length > 0;
  const hasGroups = groups.length > 0;
  const hasSessionPlan = reports.some(r => r.report_type === "session_plan");
  const baseUrl = `/classes/${classGroup?.id}`;
  const sessionLabel = subject?.report_labels?.session || "séance";

  let status, human_label, next_action_label, next_action_url, missing_parts = [];

  if (!hasLearners) {
    status = "no_learners";
    human_label = "Groupe vide";
    next_action_label = "Ajouter des apprenants";
    next_action_url = `${baseUrl}/add-learners`;
    missing_parts = ["apprenants"];
  } else if (!hasCompletedObs) {
    if (draftObs.length > 0) {
      status = "observation_draft";
      human_label = "Observation en cours";
      next_action_label = "Continuer l'observation";
      next_action_url = `${baseUrl}/observe/${draftObs[0].id}`;
      missing_parts = ["observation terminée"];
    } else {
      status = "ready_for_observation";
      human_label = "Prêt pour l'observation";
      next_action_label = "Lancer une observation";
      next_action_url = `${baseUrl}/observe`;
      missing_parts = ["observation"];
    }
  } else if (!hasGroups) {
    status = mapResult ? "map_generated" : "observation_completed";
    human_label = "Observation terminée";
    next_action_label = "Générer les groupes";
    next_action_url = `${baseUrl}/groups`;
    missing_parts = ["groupes de besoin"];
  } else if (!hasSessionPlan) {
    status = "groups_generated";
    human_label = "Groupes constitués";
    next_action_label = `Préparer la ${sessionLabel}`;
    next_action_url = `${baseUrl}/session-plan`;
    missing_parts = [`plan de ${sessionLabel}`];
  } else {
    status = "session_plan_ready";
    human_label = "Groupe prêt";
    next_action_label = "Exporter la synthèse";
    next_action_url = `${baseUrl}/print`;
    missing_parts = [];
  }

  return {
    status, human_label, next_action_label, next_action_url, missing_parts,
    can_generate_map: hasCompletedObs,
    can_generate_groups: hasCompletedObs,
    can_generate_session_plan: hasGroups,
    can_export: hasCompletedObs,
  };
}

// Backward compat aliases for pages mid-migration
export const ALL_CRITERIA = [];
export const QUICK_KEYS = [];
export const STANDARD_KEYS = [];
export const COMPLETE_KEYS = [];
