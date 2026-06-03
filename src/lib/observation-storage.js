import { parseJsonField } from "./subject-templates";
import { normalizeScores } from "./map-engine";

export function scoresToPayload(scores, meta = {}) {
  return {
    scores_json: scores,
    tags_json: meta.tags || null,
    main_need: meta.main_need || null,
    reliability_label: meta.reliability_label || null,
    notes: meta.notes || null,
  };
}

export function payloadToScores(learnerObs, competencies) {
  return normalizeScores(learnerObs, competencies);
}

export function gridRowToPayload(gridRow, competencies) {
  const scores = {};
  (competencies || []).forEach(c => {
    if (gridRow[c.key] != null) scores[c.key] = gridRow[c.key];
  });
  return scoresToPayload(scores, {
    main_need: gridRow.main_need,
    notes: gridRow.notes,
    reliability_label: gridRow.reliability_label,
  });
}

export function mergeGridFromObservations(learnerObservations, competencies) {
  const grid = {};
  (learnerObservations || []).forEach(lo => {
    const scores = payloadToScores(lo, competencies);
    grid[lo.learner_id] = {
      ...scores,
      main_need: lo.main_need,
      notes: lo.notes,
      reliability_label: lo.reliability_label,
      id: lo.id,
    };
  });
  return grid;
}

export function parseScoresJson(value) {
  return parseJsonField(value, {});
}
