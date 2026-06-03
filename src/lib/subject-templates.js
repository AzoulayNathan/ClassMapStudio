// Default observation scale (configurable structure, default labels in French)
export const DEFAULT_OBSERVATION_SCALE = [
  { key: "strong", label: "solide", score: 4, color: "emerald" },
  { key: "ok", label: "correct", score: 3, color: "blue" },
  { key: "fragile", label: "fragile", score: 2, color: "amber" },
  { key: "blocked", label: "bloqué", score: 1, color: "red" },
  { key: "not_observed", label: "non observé", score: null, color: "gray" },
];

export const DEFAULT_REPORT_LABELS = {
  session: "séance",
  workshop: "atelier",
  training: "entraînement",
  group: "groupe",
  learner: "apprenant",
  participant: "participant",
  warm_up: "échauffement collectif",
  group_work: "travail par groupes",
  debrief: "mise en commun",
  final_activity: "activité finale",
};

function comp(key, label, short, category, opts = {}) {
  return {
    key,
    label,
    short_label: short,
    category,
    description: opts.description || "",
    observation_type: "scale",
    required_in_quick: opts.quick ?? false,
    required_in_standard: opts.standard ?? true,
    required_in_complete: opts.complete ?? true,
    grouping_weight: opts.grouping_weight ?? 1.0,
    priority_weight: opts.priority_weight ?? 1.0,
    enabled: true,
  };
}

function groupTpl(key, name, triggers, activity, success, maxSize = 6) {
  return {
    key,
    name,
    trigger_competencies: triggers,
    activity,
    success_indicator: success,
    max_size: maxSize,
    priority: "moyenne",
    duration: "15–20 min",
    teacher_note: "",
  };
}

const FLE_COMPETENCIES = [
  comp("instruction_comprehension", "Compréhension des consignes", "Consignes", "understanding", { quick: true, standard: true }),
  comp("participation", "Participation orale", "Particip.", "production", { quick: true }),
  comp("oral_confidence", "Confiance orale", "Confiance", "confidence", { standard: true }),
  comp("vocabulary", "Vocabulaire disponible", "Vocab.", "production", { quick: true }),
  comp("grammar_accuracy", "Précision grammaticale", "Gramm.", "accuracy", { standard: true }),
  comp("written_production", "Production écrite", "Écrit", "production", { quick: true }),
  comp("comprehension", "Compréhension", "Compréh.", "understanding", { standard: true }),
  comp("autonomy", "Autonomie", "Autonomie", "autonomy", { quick: true, standard: true }),
  comp("error_reaction", "Réaction face à l'erreur", "Réact.", "confidence", { standard: true }),
];

const MATHS_COMPETENCIES = [
  comp("statement_comprehension", "Compréhension d'énoncé", "Énoncé", "understanding", { quick: true }),
  comp("calculation", "Calcul", "Calcul", "technique", { quick: true }),
  comp("method", "Méthode", "Méthode", "method", { quick: true, standard: true }),
  comp("reasoning", "Raisonnement", "Raisonn.", "method", { standard: true }),
  comp("writing", "Rédaction", "Rédac.", "production", { standard: true }),
  comp("formulas", "Formules", "Formules", "technique", { complete: true }),
  comp("autonomy", "Autonomie", "Autonomie", "autonomy", { quick: true }),
  comp("error_reaction", "Confiance face à l'erreur", "Confiance", "confidence", { standard: true }),
];

const CS_COMPETENCIES = [
  comp("problem_understanding", "Compréhension du problème", "Problème", "understanding", { quick: true }),
  comp("logic", "Logique", "Logique", "method", { quick: true }),
  comp("syntax", "Syntaxe", "Syntaxe", "technique", { quick: true }),
  comp("decomposition", "Décomposition", "Décomp.", "method", { standard: true }),
  comp("debugging", "Debugging", "Debug", "technique", { quick: true, standard: true }),
  comp("code_reading", "Lecture de code", "Lecture", "understanding", { standard: true }),
  comp("autonomy", "Autonomie", "Autonomie", "autonomy", { standard: true }),
  comp("error_reaction", "Confiance face à l'erreur", "Confiance", "confidence", { standard: true }),
];

const CHANT_COMPETENCIES = [
  comp("pitch", "Justesse", "Justesse", "technique", { quick: true }),
  comp("rhythm", "Rythme", "Rythme", "technique", { quick: true }),
  comp("breathing", "Respiration", "Respir.", "technique", { quick: true }),
  comp("articulation", "Articulation", "Articul.", "technique", { standard: true }),
  comp("projection", "Projection", "Project.", "technique", { standard: true }),
  comp("listening", "Écoute", "Écoute", "understanding", { standard: true }),
  comp("confidence", "Confiance", "Confiance", "confidence", { quick: true }),
  comp("memorization", "Mémorisation", "Mémor.", "method", { complete: true }),
];

const SUPPORT_COMPETENCIES = [
  comp("instruction_comprehension", "Compréhension des consignes", "Consignes", "understanding", { quick: true }),
  comp("attention", "Attention", "Attention", "behavior", { quick: true }),
  comp("method", "Méthode", "Méthode", "method", { quick: true }),
  comp("autonomy", "Autonomie", "Autonomie", "autonomy", { quick: true }),
  comp("organization", "Organisation", "Organis.", "method", { standard: true }),
  comp("confidence", "Confiance", "Confiance", "confidence", { standard: true }),
  comp("production", "Production", "Product.", "production", { standard: true }),
  comp("memorization", "Mémorisation", "Mémor.", "method", { complete: true }),
];

const SCIENCES_COMPETENCIES = [
  comp("instruction_comprehension", "Compréhension de consigne", "Consigne", "understanding", { quick: true }),
  comp("protocol", "Protocole", "Protocole", "method", { quick: true }),
  comp("reasoning", "Raisonnement", "Raisonn.", "method", { standard: true }),
  comp("calculation", "Calcul", "Calcul", "technique", { standard: true }),
  comp("scientific_vocabulary", "Vocabulaire scientifique", "Vocab.", "production", { standard: true }),
  comp("restitution", "Restitution", "Restit.", "production", { complete: true }),
  comp("autonomy", "Autonomie", "Autonomie", "autonomy", { quick: true }),
];

export function parseJsonField(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function subjectFromTemplate(template) {
  if (!template) return null;
  return {
    name: template.name,
    slug: template.slug,
    category: template.category,
    description: template.description,
    icon: template.icon,
    observation_scale: parseJsonField(template.observation_scale_json, DEFAULT_OBSERVATION_SCALE),
    competencies: parseJsonField(template.competencies_json, []).filter(c => c.enabled !== false),
    group_templates: parseJsonField(template.group_templates_json, []),
    activity_library: parseJsonField(template.activity_library_json, []),
    report_labels: { ...DEFAULT_REPORT_LABELS, ...parseJsonField(template.report_labels_json, {}) },
  };
}

export function getDefaultSubjectTemplates() {
  return [
    {
      name: "FLE",
      slug: "fle",
      description: "Français langue étrangère — observation orale, écrite et autonomie.",
      icon: "Languages",
      category: "languages",
      is_default_template: true,
      observation_scale_json: DEFAULT_OBSERVATION_SCALE,
      competencies_json: FLE_COMPETENCIES,
      group_templates_json: [
        groupTpl("consignes", "Groupe consignes", ["instruction_comprehension"], "Associer verbes de consigne à actions.", "Exécute la consigne sans aide."),
        groupTpl("oral", "Oral sécurisé", ["oral_confidence", "participation"], "Réponses courtes préparées, phrases modèles.", "Répond en phrase courte sans aide."),
        groupTpl("vocabulaire", "Groupe vocabulaire", ["vocabulary"], "Cartes mots/images par situation.", "Réutilise 3 mots en contexte."),
        groupTpl("ecrit", "Écrit guidé", ["written_production"], "Phrases à compléter → modèle → production.", "Produit une phrase correcte."),
        groupTpl("grammaire", "Groupe grammaire", ["grammar_accuracy"], "Un point grammatical à la fois.", "Applique la règle sur 3 exemples."),
        groupTpl("autonomie", "Groupe autonomie", ["autonomy"], "Checklist de tâche, auto-vérification.", "Passe à l'étape suivante seul."),
        groupTpl("defi", "Groupe défi", ["autonomy"], "Tâche ouverte, mini-projet.", "Produit de manière autonome."),
      ],
      report_labels_json: { ...DEFAULT_REPORT_LABELS, session: "séance" },
    },
    {
      name: "Mathématiques",
      slug: "mathematics",
      description: "Énoncés, calcul, méthode et raisonnement.",
      icon: "Calculator",
      category: "mathematics",
      is_default_template: true,
      observation_scale_json: DEFAULT_OBSERVATION_SCALE,
      competencies_json: MATHS_COMPETENCIES,
      group_templates_json: [
        groupTpl("enonces", "Groupe énoncés", ["statement_comprehension"], "Repérer données, reformuler la question.", "Identifie ce qui est demandé."),
        groupTpl("calcul", "Groupe calcul", ["calculation"], "Calculs guidés, vérification.", "Calcule sans erreur de base."),
        groupTpl("methode", "Groupe méthode", ["method"], "Étapes numérotées, modèle type.", "Applique la méthode sur un exercice."),
        groupTpl("raisonnement", "Groupe raisonnement", ["reasoning"], "Justifier chaque étape.", "Explique son raisonnement."),
        groupTpl("redaction", "Groupe rédaction", ["writing"], "Phrases de conclusion, unités.", "Rédige une réponse complète."),
        groupTpl("consolidation", "Groupe consolidation", ["method", "calculation"], "Révision active.", "Consolide 2 compétences."),
        groupTpl("defi", "Groupe défi", ["reasoning"], "Problème ouvert.", "Résout un défi autonome."),
      ],
      report_labels_json: { ...DEFAULT_REPORT_LABELS, session: "séance d'entraînement" },
    },
    {
      name: "Informatique",
      slug: "computer_science",
      description: "Logique, syntaxe, debugging et décomposition.",
      icon: "Code",
      category: "computer_science",
      is_default_template: true,
      observation_scale_json: DEFAULT_OBSERVATION_SCALE,
      competencies_json: CS_COMPETENCIES,
      group_templates_json: [
        groupTpl("logique", "Groupe logique", ["logic"], "Pseudo-code, schémas.", "Décompose le problème."),
        groupTpl("debugging", "Groupe debugging", ["debugging"], "Lire l'erreur, isoler, tester.", "Corrige une erreur simple."),
        groupTpl("syntaxe", "Groupe syntaxe", ["syntax"], "Syntaxe ciblée, exemples.", "Écrit sans erreur de syntaxe."),
        groupTpl("decomposition", "Groupe décomposition", ["decomposition"], "Découper en sous-problèmes.", "Propose un plan en étapes."),
        groupTpl("lecture", "Groupe lecture de code", ["code_reading"], "Tracer l'exécution.", "Explique un extrait de code."),
        groupTpl("projet", "Groupe projet", ["autonomy"], "Mini-projet guidé.", "Avance sur le projet."),
        groupTpl("defi", "Groupe défi", ["logic", "debugging"], "Défi algorithmique.", "Résout un problème ouvert."),
      ],
      report_labels_json: { ...DEFAULT_REPORT_LABELS, session: "atelier", workshop: "atelier" },
    },
    {
      name: "Chant / voix",
      slug: "music",
      description: "Justesse, rythme, respiration et projection.",
      icon: "Music",
      category: "music",
      is_default_template: true,
      observation_scale_json: DEFAULT_OBSERVATION_SCALE,
      competencies_json: CHANT_COMPETENCIES,
      group_templates_json: [
        groupTpl("justesse", "Groupe justesse", ["pitch"], "Exercices de justesse, accordeur.", "Chante juste sur un intervalle."),
        groupTpl("rythme", "Groupe rythme", ["rhythm"], "Métrique, pulsation.", "Respecte le rythme."),
        groupTpl("respiration", "Groupe respiration", ["breathing"], "Exercices respiratoires.", "Gère la respiration en phrase."),
        groupTpl("projection", "Groupe projection", ["projection"], "Projection sans forcer.", "Se fait entendre clairement."),
        groupTpl("interpretation", "Groupe interprétation", ["listening", "articulation"], "Travail expressif.", "Interprète avec clarté."),
        groupTpl("ecoute", "Groupe écoute", ["listening"], "Écoute active, harmonie.", "S'accorde au groupe."),
        groupTpl("confiance", "Groupe confiance", ["confidence"], "Prise de risque vocale sécurisée.", "Chante devant le groupe."),
      ],
      report_labels_json: { ...DEFAULT_REPORT_LABELS, session: "atelier vocal", warm_up: "échauffement vocal" },
    },
    {
      name: "Soutien scolaire général",
      slug: "general_support",
      description: "Méthode, autonomie, consignes et confiance.",
      icon: "BookOpen",
      category: "general_support",
      is_default_template: true,
      observation_scale_json: DEFAULT_OBSERVATION_SCALE,
      competencies_json: SUPPORT_COMPETENCIES,
      group_templates_json: [
        groupTpl("methode", "Groupe méthode", ["method"], "Fiches méthode, étapes.", "Applique une méthode."),
        groupTpl("autonomie", "Groupe autonomie", ["autonomy"], "Auto-vérification.", "Travaille seul 10 min."),
        groupTpl("consignes", "Groupe consignes", ["instruction_comprehension"], "Verbes de consigne.", "Comprend la consigne."),
        groupTpl("organisation", "Groupe organisation", ["organization"], "Agenda, priorités.", "Organise son travail."),
        groupTpl("confiance", "Groupe confiance", ["confidence"], "Petites réussites.", "Ose demander de l'aide."),
        groupTpl("consolidation", "Groupe consolidation", ["production"], "Renforcement ciblé.", "Produit un travail abouti."),
      ],
      report_labels_json: DEFAULT_REPORT_LABELS,
    },
    {
      name: "Sciences",
      slug: "sciences",
      description: "Protocole, raisonnement, calcul et vocabulaire scientifique.",
      icon: "FlaskConical",
      category: "sciences",
      is_default_template: true,
      observation_scale_json: DEFAULT_OBSERVATION_SCALE,
      competencies_json: SCIENCES_COMPETENCIES,
      group_templates_json: [
        groupTpl("consignes", "Groupe consignes", ["instruction_comprehension"], "Lire et reformuler la consigne.", "Comprend la consigne expérimentale."),
        groupTpl("protocole", "Groupe protocole", ["protocol"], "Étapes du protocole.", "Suit le protocole."),
        groupTpl("raisonnement", "Groupe raisonnement", ["reasoning"], "Hypothèses, conclusions.", "Justifie une conclusion."),
        groupTpl("calcul", "Groupe calcul", ["calculation"], "Calculs scientifiques.", "Calcule correctement."),
        groupTpl("vocabulaire", "Groupe vocabulaire", ["scientific_vocabulary"], "Lexique thématique.", "Utilise le vocabulaire adapté."),
        groupTpl("restitution", "Groupe restitution", ["restitution"], "Compte-rendu structuré.", "Restitue les résultats."),
      ],
      report_labels_json: DEFAULT_REPORT_LABELS,
    },
    {
      name: "Modèle vide",
      slug: "custom_blank",
      description: "Créez votre matière de zéro avec vos propres compétences.",
      icon: "Plus",
      category: "custom",
      is_default_template: true,
      observation_scale_json: DEFAULT_OBSERVATION_SCALE,
      competencies_json: [
        comp("competency_1", "Compétence 1", "Comp. 1", "custom", { quick: true, standard: true }),
        comp("competency_2", "Compétence 2", "Comp. 2", "custom", { standard: true }),
        comp("competency_3", "Compétence 3", "Comp. 3", "custom", { standard: true }),
      ],
      group_templates_json: [],
      report_labels_json: DEFAULT_REPORT_LABELS,
    },
  ];
}

export function getTemplateBySlug(slug) {
  return getDefaultSubjectTemplates().find(t => t.slug === slug) || null;
}

export function competenciesFromLines(text) {
  return text.split("\n").map(l => l.trim()).filter(Boolean).map((label, i) =>
    comp(`custom_${i + 1}`, label, label.slice(0, 12), "custom", { quick: i < 3, standard: true })
  );
}
