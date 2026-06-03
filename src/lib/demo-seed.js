import { base44 } from "@/api/base44Client";
import { buildGroupSubjectPayload } from "@/lib/subject-resolver";
import { getTemplateBySlug } from "@/lib/subject-templates";
import { buildClassMapResult, generateNeedGroups, buildObsMap } from "@/lib/map-engine";
import { scoresToPayload } from "@/lib/observation-storage";
import { subjectFromTemplate } from "@/lib/subject-resolver";

const LEVELS = ["non observé", "solide", "correct", "fragile", "bloqué"];

function pickLevel(i, j) {
  return LEVELS[(i + j) % LEVELS.length];
}

const DEMO_GROUPS = [
  { slug: "fle", name: "Classe A1 — démo FLE", learners: ["Amira", "Carlos", "Mei", "Omar", "Sofia", "Yuki"], goal: "oral et consignes" },
  { slug: "mathematics", name: "Groupe maths 3e — démo", learners: ["Emma", "Lucas", "Inès", "Noah", "Lina"], goal: "méthode et raisonnement" },
  { slug: "computer_science", name: "Python débutants — démo", learners: ["Alex", "Jordan", "Sam", "Taylor"], goal: "logique et debugging" },
  { slug: "music", name: "Atelier vocal — démo", learners: ["Chloé", "Hugo", "Léa", "Max", "Zoé"], goal: "justesse et respiration" },
];

export async function seedDemoData() {
  const created = [];

  for (const demo of DEMO_GROUPS) {
    const tpl = getTemplateBySlug(demo.slug);
    const subjectPayload = buildGroupSubjectPayload(tpl, { name: demo.name, main_goal: demo.goal, context_type: "démo", profile_type: "mixte" });

    const group = await base44.entities.ClassGroup.create({
      name: demo.name,
      status: "active",
      notes: "Groupe de démonstration ClassMap Studio",
      ...subjectPayload,
    });

    const subject = subjectFromTemplate(tpl);
    const learnerRecords = [];
    for (const first_name of demo.learners) {
      const l = await base44.entities.ClassLearner.create({
        class_id: group.id,
        first_name,
        status: "active",
        profile_type: "mixte",
      });
      learnerRecords.push(l);
    }

    const obs = await base44.entities.ClassObservation.create({
      class_id: group.id,
      observation_date: new Date().toISOString().split("T")[0],
      observation_type: "standard",
      focus: "mixed",
      status: "completed",
    });

    const competencies = subject.competencies.filter(c => c.required_in_standard !== false);
    for (let i = 0; i < learnerRecords.length; i++) {
      const scores = {};
      competencies.forEach((c, j) => { scores[c.key] = pickLevel(i, j); });
      await base44.entities.LearnerObservation.create({
        class_id: group.id,
        learner_id: learnerRecords[i].id,
        observation_id: obs.id,
        ...scoresToPayload(scores),
      });
    }

    const allObs = await base44.entities.LearnerObservation.filter({ observation_id: obs.id });
    const mapData = buildClassMapResult(group, subject, learnerRecords, allObs);
    await base44.entities.ClassMapResult.create({
      class_id: group.id,
      observation_id: obs.id,
      class_summary: mapData.class_summary,
      collective_priorities_json: JSON.stringify(mapData.priorities),
      need_groups_json: JSON.stringify(mapData.recommended_groups),
      outlier_learners_json: JSON.stringify(mapData.alerts),
      learner_profiles_json: JSON.stringify(mapData.learner_profiles),
      subject_name: subject.name,
      subject_category: subject.category,
      reliability_label: mapData.reliability_label,
      risks_json: JSON.stringify(mapData.risks),
    });

    const obsMap = buildObsMap(allObs, subject);
    const generated = generateNeedGroups(learnerRecords, obsMap, subject);
    for (const g of generated.slice(0, 3)) {
      await base44.entities.NeedGroup.create({
        class_id: group.id,
        observation_id: obs.id,
        group_name: g.name,
        group_type: g.type,
        priority_competency_key: g.type,
        priority_competency_label: g.name,
        learner_ids_json: JSON.stringify(g.memberIds),
        rationale: g.risk || "",
        recommended_activity: g.activity,
        difficulty_level: g.priority,
        teacher_notes: `Durée : ${g.duration}. ${g.success}`,
        status: "active",
      });
    }

    created.push(group);
  }

  return created;
}
