import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Users, Loader2, Wand2, Printer } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { useClassSubject } from "@/hooks/useClassSubject";
import { buildObsMap } from "@/lib/map-engine";

const REPORT_TYPES = [
  { type: "teacher_summary", label: "Synthèse enseignant", icon: FileText, desc: "Résumé complet du groupe avec profils, priorités et recommandations" },
  { type: "group_sheet", label: "Fiche groupes", icon: Users, desc: "Liste des groupes avec membres, objectifs et activités" },
  { type: "session_plan", label: "Plan de séance / atelier", icon: FileText, desc: "Lien vers le plan généré" },
  { type: "learner_export", label: "Liste apprenants", icon: Users, desc: "Liste des apprenants avec besoin principal" },
];

export default function Reports() {
  const { classId } = useParams();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(null);

  const { classGroup: cls, subject } = useClassSubject(classId);
  const { data: reports = [] } = useQuery({ queryKey: ["reports", classId], queryFn: () => base44.entities.ClassReport.filter({ class_id: classId }, "-created_date") });
  const { data: learners = [] } = useQuery({ queryKey: ["learners", classId], queryFn: () => base44.entities.ClassLearner.filter({ class_id: classId, status: "active" }) });
  const { data: groups = [] } = useQuery({ queryKey: ["groups", classId], queryFn: () => base44.entities.NeedGroup.filter({ class_id: classId, status: "active" }) });
  const { data: observations = [] } = useQuery({ queryKey: ["observations", classId], queryFn: () => base44.entities.ClassObservation.filter({ class_id: classId, status: "completed" }, "-created_date", 1) });
  const lastObs = observations[0];
  const { data: learnerObs = [] } = useQuery({ queryKey: ["learner-obs-rep", lastObs?.id], queryFn: () => lastObs ? base44.entities.LearnerObservation.filter({ observation_id: lastObs.id }) : [], enabled: !!lastObs });

  const learnerMap = {};
  learners.forEach(l => { learnerMap[l.id] = l; });
  const obsMap = buildObsMap(learnerObs, subject);

  const generateReport = async (type) => {
    setGenerating(type);
    let content = "";

    if (type === "teacher_summary") {
      const groupInfo = groups.map(g => {
        const ids = (() => { try { return JSON.parse(g.learner_ids_json || "[]"); } catch { return []; } })();
        return `${g.group_name}: ${ids.map(id => learnerMap[id]?.first_name).filter(Boolean).join(", ")} — ${g.rationale}`;
      }).join("\n");

      const subjectName = subject?.name || cls?.subject_name || "matière";
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un expert en pédagogie pour la matière "${subjectName}". Rédige une synthèse enseignant pour ce groupe:
Groupe: ${cls?.name}, Matière: ${subjectName}, Contexte: ${cls?.context_type}, Objectif: ${cls?.main_goal}
Nombre d'apprenants: ${learners.length}
Groupes de besoin:\n${groupInfo}

Inclus: résumé, profils dominants, priorités collectives, groupes, apprenants à surveiller, recommandations. Écris en français, format Markdown. N'utilise pas de vocabulaire FLE sauf si la matière est FLE.`,
      });
      content = result;
    } else if (type === "group_sheet") {
      content = groups.map(g => {
        const ids = (() => { try { return JSON.parse(g.learner_ids_json || "[]"); } catch { return []; } })();
        const names = ids.map(id => learnerMap[id]?.first_name).filter(Boolean).join(", ");
        return `## ${g.group_name}\n**Objectif:** ${g.rationale}\n**Membres:** ${names}\n**Activité:** ${g.recommended_activity}\n`;
      }).join("\n---\n\n");
    } else if (type === "learner_export") {
      content = "| Nom | Profil | Contexte | Besoin principal |\n|---|---|---|---|\n" +
        learners.map(l => `| ${l.first_name} | ${l.initial_profile_label || l.initial_level_estimate || "—"} | ${l.background_info || l.main_language || "—"} | ${l.main_need || "—"} |`).join("\n");
    }

    await base44.entities.ClassReport.create({
      class_id: classId,
      report_type: type,
      title: `${REPORT_TYPES.find(r => r.type === type)?.label} — ${new Date().toLocaleDateString("fr-FR")}`,
      content_text: typeof content === "string" ? content : JSON.stringify(content),
      export_status: "ready",
    });

    queryClient.invalidateQueries({ queryKey: ["reports", classId] });
    setGenerating(null);
    toast.success("Rapport généré");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link to={`/classes/${classId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="font-heading text-2xl font-bold">Rapports</h1>
          <p className="text-sm text-muted-foreground font-body">{cls?.name}{subject?.name ? ` · ${subject.name}` : ""}</p>
        </div>
      </div>

      {/* Generate buttons */}
      <div className="grid sm:grid-cols-3 gap-4">
        {REPORT_TYPES.map(rt => (
          <div key={rt.type} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <rt.icon className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold text-sm">{rt.label}</h3>
            <p className="text-xs text-muted-foreground font-body">{rt.desc}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateReport(rt.type)}
              disabled={generating === rt.type}
              className="w-full font-body gap-1"
            >
              {generating === rt.type ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Générer
            </Button>
          </div>
        ))}
      </div>

      {/* Print export */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
        <div>
          <p className="font-heading font-semibold text-sm">Rapport imprimable complet</p>
          <p className="text-xs text-muted-foreground font-body">Carte pédagogique · Groupes · Plan · Liste apprenants</p>
        </div>
        <Link to={`/classes/${classId}/print`}>
          <Button variant="outline" className="font-body gap-2">
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </Button>
        </Link>
      </div>

      {/* Existing reports */}
      {reports.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-semibold mb-4">Rapports générés</h2>
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-semibold text-sm">{r.title}</h3>
                  <span className="text-xs text-muted-foreground font-body">{new Date(r.created_date).toLocaleDateString("fr-FR")}</span>
                </div>
                {r.content_text && (
                  <div className="prose prose-sm max-w-none font-body text-sm text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {r.content_text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}