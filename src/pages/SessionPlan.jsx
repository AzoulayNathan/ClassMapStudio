import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wand2, ClipboardList, Loader2, Printer, Target, Clock } from "lucide-react";
import { toast } from "sonner";

import { useClassSubject } from "@/hooks/useClassSubject";

export default function SessionPlan() {
  const { classId } = useParams();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const { classGroup: cls, subject } = useClassSubject(classId);
  const { data: groups = [] } = useQuery({ queryKey: ["groups", classId], queryFn: () => base44.entities.NeedGroup.filter({ class_id: classId, status: "active" }) });
  const { data: learners = [] } = useQuery({ queryKey: ["learners", classId], queryFn: () => base44.entities.ClassLearner.filter({ class_id: classId, status: "active" }) });
  const { data: reports = [] } = useQuery({ queryKey: ["session-plans", classId], queryFn: () => base44.entities.ClassReport.filter({ class_id: classId, report_type: "session_plan" }, "-created_date", 5) });

  const learnerMap = {};
  learners.forEach(l => { learnerMap[l.id] = l; });

  const generatePlan = async () => {
    if (groups.length === 0) { toast.error("Créez d'abord des groupes de besoin"); return; }
    setGenerating(true);

    const groupDescriptions = groups.map(g => {
      const memberIds = (() => { try { return JSON.parse(g.learner_ids_json || "[]"); } catch { return []; } })();
      const names = memberIds.map(id => learnerMap[id]?.first_name).filter(Boolean).join(", ");
      return `- ${g.group_name}: ${g.rationale}. Membres: ${names}. Activité suggérée: ${g.recommended_activity}`;
    }).join("\n");

    const sessionLabel = subject?.report_labels?.session || "séance";
    const subjectName = subject?.name || cls?.subject_name || "matière";

    const prompt = `Tu es un expert en pédagogie pour la matière "${subjectName}". Génère un plan de ${sessionLabel} différenciée pour ce groupe:
Groupe: ${cls?.name || "groupe"}
Matière: ${subjectName}
Objectif principal: ${cls?.main_goal || "à définir"}
Nombre d'apprenants: ${learners.length}

Groupes de besoin:
${groupDescriptions}

Génère un plan structuré avec:
1. Objectif commun
2. ${subject?.report_labels?.warm_up || "Démarrage collectif"} (5-10 min)
3. ${subject?.report_labels?.group_work || "Travail par groupes"} (pour chaque groupe: consigne, objectif, activité, durée, rôle de l'enseignant)
4. ${subject?.report_labels?.debrief || "Mise en commun"} (5-10 min)
5. ${subject?.report_labels?.final_activity || "Trace / production / exercice final"}
6. Points à observer pour la prochaine fois

Sois précis, concret et pratique. Écris en français. N'utilise pas de vocabulaire FLE sauf si la matière est FLE.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          objectif_commun: { type: "string" },
          demarrage: { type: "object", properties: { activite: { type: "string" }, duree: { type: "string" } } },
          travail_groupes: { type: "array", items: { type: "object", properties: { groupe: { type: "string" }, consigne: { type: "string" }, objectif: { type: "string" }, activite: { type: "string" }, duree: { type: "string" }, role_prof: { type: "string" } } } },
          mise_en_commun: { type: "object", properties: { activite: { type: "string" }, duree: { type: "string" } } },
          trace_ecrite: { type: "string" },
          points_observation: { type: "array", items: { type: "string" } },
        },
      },
    });

    await base44.entities.ClassReport.create({
      class_id: classId,
      report_type: "session_plan",
      title: `Plan de ${sessionLabel} — ${new Date().toLocaleDateString("fr-FR")}`,
      content_json: JSON.stringify(result),
      export_status: "ready",
    });

    queryClient.invalidateQueries({ queryKey: ["session-plans", classId] });
    setGenerating(false);
    toast.success(`Plan de ${sessionLabel} généré`);
  };

  const latestPlan = reports[0];
  const planData = latestPlan ? (() => { try { return JSON.parse(latestPlan.content_json); } catch { return null; } })() : null;

  const sessionLabel = subject?.report_labels?.session || "séance";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/classes/${classId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="font-heading text-2xl font-bold">Plan de {sessionLabel} / atelier</h1>
            <p className="text-sm text-muted-foreground font-body">{cls?.name}{subject?.name ? ` · ${subject.name}` : ""} · {groups.length} groupe{groups.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {planData && (
            <Link to={`/classes/${classId}/print`}>
              <Button variant="outline" className="font-body gap-1.5">
                <Printer className="h-4 w-4" /> Exporter
              </Button>
            </Link>
          )}
          <Button onClick={generatePlan} disabled={generating || groups.length === 0} className="font-body gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {generating ? "Génération..." : "Générer un plan"}
          </Button>
        </div>
      </div>

      {!planData ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-body mb-2">Aucun plan de séance pour l'instant.</p>
          <p className="text-xs text-muted-foreground font-body">
            {groups.length > 0 ? "Cliquez sur « Générer un plan » pour créer un plan différencié." : "Créez d'abord des groupes de besoin."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Objective */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
            <h2 className="font-heading font-semibold text-primary mb-2">Objectif commun</h2>
            <p className="font-body text-sm">{planData.objectif_commun}</p>
          </div>

          {/* Démarrage */}
          {planData.demarrage && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-heading font-semibold mb-2">Démarrage collectif <span className="text-xs font-body text-muted-foreground font-normal">({planData.demarrage.duree})</span></h2>
              <p className="font-body text-sm">{planData.demarrage.activite}</p>
            </div>
          )}

          {/* Groups */}
          {planData.travail_groupes?.map((g, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-heading font-semibold">{g.groupe}</h2>
                {g.duree && <span className="flex items-center gap-1 text-xs text-muted-foreground font-body"><Clock className="h-3 w-3" /> {g.duree}</span>}
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm font-body">
                <div><span className="font-medium text-muted-foreground">Objectif : </span>{g.objectif}</div>
                <div><span className="font-medium text-muted-foreground">Activité : </span>{g.activite}</div>
                <div><span className="font-medium text-muted-foreground">Consigne : </span>{g.consigne}</div>
                <div><span className="font-medium text-muted-foreground">Rôle prof : </span>{g.role_prof}</div>
              </div>
              {g.indicateur_reussite && (
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <Target className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs font-body text-emerald-800"><span className="font-medium">Indicateur : </span>{g.indicateur_reussite}</p>
                </div>
              )}
            </div>
          ))}

          {/* Mise en commun */}
          {planData.mise_en_commun && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-heading font-semibold mb-2">Mise en commun <span className="text-xs font-body text-muted-foreground font-normal">({planData.mise_en_commun.duree})</span></h2>
              <p className="font-body text-sm">{planData.mise_en_commun.activite}</p>
            </div>
          )}

          {/* Trace écrite */}
          {planData.trace_ecrite && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-heading font-semibold mb-2">Trace écrite / Devoir</h2>
              <p className="font-body text-sm">{planData.trace_ecrite}</p>
            </div>
          )}

          {/* Points d'observation */}
          {planData.points_observation?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="font-heading font-semibold mb-2 text-amber-800">Points à observer</h2>
              <ul className="space-y-1">
                {planData.points_observation.map((p, i) => (
                  <li key={i} className="font-body text-sm text-amber-900 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}