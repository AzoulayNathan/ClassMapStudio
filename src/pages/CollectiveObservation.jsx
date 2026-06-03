import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, Save, Info } from "lucide-react";
import CompetencyBadge from "../components/CompetencyBadge";
import { toast } from "sonner";
import { useClassSubject } from "@/hooks/useClassSubject";
import { getActiveCompetencies, getObservationScale, buildClassMapResult } from "../lib/map-engine";
import { gridRowToPayload, mergeGridFromObservations } from "../lib/observation-storage";

export default function CollectiveObservation() {
  const { classId, observationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { classGroup: cls, subject } = useClassSubject(classId);
  const [obsType, setObsType] = useState("standard");
  const [grid, setGrid] = useState({});
  const [currentObsId, setCurrentObsId] = useState(observationId || null);
  const [saving, setSaving] = useState(false);

  const scale = useMemo(() => getObservationScale(subject), [subject]);
  const levelsCycle = useMemo(() => scale.map(s => s.label), [scale]);
  const notObserved = scale.find(s => s.score == null)?.label || "non observé";

  const criteria = useMemo(
    () => getActiveCompetencies(subject, obsType).map(c => ({ ...c, short: c.short_label })),
    [subject, obsType]
  );

  const { data: learners = [] } = useQuery({
    queryKey: ["learners", classId],
    queryFn: () => base44.entities.ClassLearner.filter({ class_id: classId, status: "active" }),
  });

  const { data: existingObs } = useQuery({
    queryKey: ["observation", currentObsId],
    queryFn: () => currentObsId ? base44.entities.ClassObservation.get(currentObsId) : null,
    enabled: !!currentObsId,
  });

  const { data: learnerObs = [] } = useQuery({
    queryKey: ["learner-obs", currentObsId],
    queryFn: () => currentObsId ? base44.entities.LearnerObservation.filter({ observation_id: currentObsId }) : [],
    enabled: !!currentObsId,
  });

  useEffect(() => { if (existingObs) setObsType(existingObs.observation_type || "standard"); }, [existingObs]);

  useEffect(() => {
    if (learnerObs.length > 0 && subject) {
      setGrid(mergeGridFromObservations(learnerObs, subject.competencies));
    }
  }, [learnerObs, subject]);

  const cycleLevel = useCallback((learnerId, key) => {
    setGrid(prev => {
      const current = prev[learnerId]?.[key] || notObserved;
      const idx = levelsCycle.indexOf(current);
      const next = levelsCycle[(idx + 1) % levelsCycle.length];
      return { ...prev, [learnerId]: { ...prev[learnerId], [key]: next } };
    });
  }, [levelsCycle, notObserved]);

  const handleStart = async () => {
    const obs = await base44.entities.ClassObservation.create({
      class_id: classId,
      observation_date: new Date().toISOString().split("T")[0],
      observation_type: obsType,
      focus: "mixed",
      status: "draft",
    });
    setCurrentObsId(obs.id);
  };

  const handleSave = async (complete = false) => {
    if (complete) {
      const unobservedCount = learners.filter(l => {
        const d = grid[l.id] || {};
        return criteria.every(c => !d[c.key] || d[c.key] === notObserved);
      }).length;
      if (unobservedCount > learners.length * 0.4) {
        const ok = window.confirm(`${unobservedCount} apprenant${unobservedCount > 1 ? "s" : ""} sur ${learners.length} n'ont pas encore de données. Générer une carte partielle quand même ?`);
        if (!ok) return;
      }
    }
    setSaving(true);
    const existing = {};
    learnerObs.forEach(lo => { existing[lo.learner_id] = lo; });

    for (const learner of learners) {
      const row = grid[learner.id] || {};
      const hasData = criteria.some(c => row[c.key] && row[c.key] !== notObserved);
      if (!hasData && !existing[learner.id]) continue;

      const payload = {
        class_id: classId,
        learner_id: learner.id,
        observation_id: currentObsId,
        ...gridRowToPayload(row, criteria),
      };
      if (existing[learner.id]) {
        await base44.entities.LearnerObservation.update(existing[learner.id].id, payload);
      } else {
        await base44.entities.LearnerObservation.create(payload);
      }
    }

    if (complete) {
      await base44.entities.ClassObservation.update(currentObsId, { status: "completed" });
      const allObs = await base44.entities.LearnerObservation.filter({ observation_id: currentObsId });
      const mapData = buildClassMapResult(cls, subject, learners, allObs);
      const existingResults = await base44.entities.ClassMapResult.filter({ class_id: classId, observation_id: currentObsId });
      const mapPayload = {
        class_id: classId,
        observation_id: currentObsId,
        class_summary: mapData.class_summary,
        collective_priorities_json: JSON.stringify(mapData.priorities),
        need_groups_json: JSON.stringify(mapData.recommended_groups),
        outlier_learners_json: JSON.stringify(mapData.alerts),
        learner_profiles_json: JSON.stringify(mapData.learner_profiles),
        risks_json: JSON.stringify(mapData.risks),
        subject_name: mapData.subject_name,
        subject_category: mapData.subject_category,
        competencies_snapshot_json: JSON.stringify(subject?.competencies),
        observation_scale_snapshot_json: JSON.stringify(scale),
        reliability_label: mapData.reliability_label,
        teacher_validated: false,
      };
      if (existingResults.length > 0) {
        await base44.entities.ClassMapResult.update(existingResults[0].id, mapPayload);
      } else {
        await base44.entities.ClassMapResult.create(mapPayload);
      }
      queryClient.invalidateQueries({ queryKey: ["observations", classId] });
      queryClient.invalidateQueries({ queryKey: ["map-result", classId] });
      toast.success("Observation terminée — carte pédagogique générée !");
      navigate(`/classes/${classId}/map`);
    } else {
      queryClient.invalidateQueries({ queryKey: ["learner-obs", currentObsId] });
      toast.success("Sauvegardé");
    }
    setSaving(false);
  };

  const quickCount = getActiveCompetencies(subject, "quick").length;
  const standardCount = getActiveCompetencies(subject, "standard").length;
  const completeCount = getActiveCompetencies(subject, "complete").length;

  if (!currentObsId) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to={`/classes/${classId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="font-heading text-2xl font-bold">Observation du groupe</h1>
            <p className="text-sm text-muted-foreground font-body">{cls?.name}{subject?.name ? ` · ${subject.name}` : ""}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <p className="text-sm text-muted-foreground font-body">Évaluez rapidement les compétences choisies pour cette matière.</p>
          <div>
            <label className="font-body text-sm font-medium">Type d'observation</label>
            <Select value={obsType} onValueChange={setObsType}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Rapide — {quickCount} critères</SelectItem>
                <SelectItem value="standard">Standard — {standardCount} critères (recommandé)</SelectItem>
                <SelectItem value="complete">Complète — {completeCount} critères</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-3 bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-body font-medium text-muted-foreground mb-1">Critères observés :</p>
              <div className="flex flex-wrap gap-1.5">
                {criteria.map(c => (
                  <span key={c.key} className="text-xs bg-background border border-border rounded px-2 py-0.5 font-body">{c.short_label}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-3">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground font-body">
              Chaque cellule est cliquable. Cycle : <strong>{levelsCycle.join(" → ")}</strong>.
            </p>
          </div>
          <Button onClick={handleStart} disabled={learners.length === 0} className="w-full font-body">
            {learners.length === 0 ? "Ajoutez d'abord des apprenants" : `Commencer — ${learners.length} apprenant${learners.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    );
  }

  const filledCount = learners.filter(l => {
    const d = grid[l.id] || {};
    return criteria.some(c => d[c.key] && d[c.key] !== notObserved);
  }).length;
  const completionPct = learners.length > 0 ? Math.round((filledCount / learners.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/classes/${classId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="font-heading text-xl font-bold">Observation du groupe</h1>
            <p className="text-sm text-muted-foreground font-body">
              {cls?.name} · {filledCount}/{learners.length} apprenants
              <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${completionPct >= 80 ? "text-emerald-700 bg-emerald-50" : completionPct >= 50 ? "text-amber-700 bg-amber-50" : "text-muted-foreground bg-muted"}`}>{completionPct}%</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving} className="font-body gap-1.5">
            <Save className="h-3.5 w-3.5" /> Sauvegarder
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving} className="font-body gap-1.5">
            <Check className="h-3.5 w-3.5" /> Terminer → carte
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-heading font-medium sticky left-0 bg-muted/50 z-10 min-w-[130px]">Apprenant</th>
                {criteria.map(c => (
                  <th key={c.key} className="text-center px-2 py-3 font-body font-medium text-muted-foreground text-xs min-w-[82px]">
                    <span title={c.label}>{c.short_label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {learners.map(l => {
                const rowData = grid[l.id] || {};
                const hasData = criteria.some(c => rowData[c.key] && rowData[c.key] !== notObserved);
                return (
                  <tr key={l.id} className={`border-b border-border last:border-0 hover:bg-muted/20 ${!hasData ? "opacity-60" : ""}`}>
                    <td className="px-4 py-2.5 font-body font-medium sticky left-0 bg-card z-10">{l.first_name}</td>
                    {criteria.map(c => (
                      <td key={c.key} className="px-2 py-2 text-center">
                        <CompetencyBadge level={rowData[c.key] || notObserved} onClick={() => cycleLevel(l.id, c.key)} className="cursor-pointer" />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-body">
        <span className="font-medium">Légende :</span>
        {levelsCycle.map(l => (
          <span key={l} className="flex items-center gap-1"><CompetencyBadge level={l} size="sm" /></span>
        ))}
      </div>
    </div>
  );
}
