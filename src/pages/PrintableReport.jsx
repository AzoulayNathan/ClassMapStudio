import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import CompetencyBadge from "../components/CompetencyBadge";
import { useClassSubject } from "@/hooks/useClassSubject";
import {
  getActiveCompetencies, computeCollectivePriorities, computeAlerts, computeTags,
  TAG_META, computeReliability, buildObsMap,
} from "../lib/map-engine";

const PRIORITY_COLOR = {
  forte: "text-red-700",
  moyenne: "text-amber-700",
  faible: "text-emerald-700",
};

export default function PrintableReport() {
  const { classId } = useParams();

  const { classGroup: cls, subject } = useClassSubject(classId);
  const criteria = getActiveCompetencies(subject, "complete");
  const { data: learners = [] } = useQuery({ queryKey: ["learners", classId], queryFn: () => base44.entities.ClassLearner.filter({ class_id: classId, status: "active" }) });
  const { data: observations = [] } = useQuery({ queryKey: ["observations", classId], queryFn: () => base44.entities.ClassObservation.filter({ class_id: classId, status: "completed" }, "-created_date", 1) });
  const lastObs = observations[0];
  const { data: learnerObs = [] } = useQuery({
    queryKey: ["learner-obs-print", lastObs?.id],
    queryFn: () => lastObs ? base44.entities.LearnerObservation.filter({ observation_id: lastObs.id }) : [],
    enabled: !!lastObs,
  });
  const { data: groups = [] } = useQuery({ queryKey: ["groups", classId], queryFn: () => base44.entities.NeedGroup.filter({ class_id: classId, status: "active" }) });
  const { data: sessionPlans = [] } = useQuery({ queryKey: ["session-plans", classId], queryFn: () => base44.entities.ClassReport.filter({ class_id: classId, report_type: "session_plan" }, "-created_date", 1) });

  const obsMap = buildObsMap(learnerObs, subject);
  const learnerMap = {};
  learners.forEach(l => { learnerMap[l.id] = l; });

  const priorities = computeCollectivePriorities(learners, obsMap, subject);
  const reliability = computeReliability(learners, obsMap, subject);
  const alerts = computeAlerts(learners, obsMap, subject);
  const highPriorities = priorities.filter(p => p.priority === "forte" || p.priority === "moyenne");
  const watchList = alerts.filter(a => a.type !== "eleve_ressource");
  const resources = alerts.filter(a => a.type === "eleve_ressource");

  const latestPlan = sessionPlans[0];
  const planData = latestPlan ? (() => { try { return JSON.parse(latestPlan.content_json); } catch { return null; } })() : null;

  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          body { font-size: 11px; }
          .print-page { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6 print-page">
        {/* Actions bar — hidden on print */}
        <div className="no-print flex items-center justify-between">
          <Link to={`/classes/${classId}`}><Button variant="ghost" size="sm" className="font-body gap-1.5"><ArrowLeft className="h-4 w-4" /> Retour</Button></Link>
          <Button onClick={() => window.print()} className="font-body gap-2">
            <Printer className="h-4 w-4" /> Imprimer / Exporter PDF
          </Button>
        </div>

        {/* Report header */}
        <div className="border-b-2 border-foreground pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-widest mb-1">ClassMap Studio — Carte pédagogique{subject?.name ? ` · ${subject.name}` : ""}</p>
              <h1 className="font-heading text-2xl font-bold">{cls?.name}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm font-body text-muted-foreground">
                {cls?.level_label && <span>Niveau : <strong>{cls.level_label}</strong></span>}
                {cls?.context_type && <span>Contexte : <strong>{cls.context_type}</strong></span>}
                {cls?.profile_type && <span>Profil : <strong>{cls.profile_type}</strong></span>}
                <span><strong>{learners.length}</strong> apprenant{learners.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground font-body space-y-1">
              <p>Généré le {today}</p>
              {lastObs && <p>Observation : {new Date(lastObs.observation_date || lastObs.created_date).toLocaleDateString("fr-FR")}</p>}
              {lastObs && (
                <p className={`inline-block px-2 py-0.5 rounded border font-medium text-xs ${
                  reliability.label === "carte solide" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                  reliability.label === "assez fiable" ? "bg-blue-100 text-blue-800 border-blue-200" :
                  reliability.label === "carte partielle" ? "bg-amber-100 text-amber-800 border-amber-200" :
                  "bg-gray-100 text-gray-600 border-gray-200"
                }`}>{reliability.label} · {reliability.pct}%</p>
              )}
            </div>
          </div>
        </div>

        {/* 1. Synthèse */}
        {lastObs && (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold border-b border-border pb-2">1. Synthèse du groupe</h2>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm font-body">
              <p>Cette classe compte <strong>{learners.length} apprenants</strong> de niveau {cls?.level_label || "non défini"} en contexte {cls?.context_type || "non défini"}.</p>
              {highPriorities.length > 0 && (
                <p>Les priorités collectives identifiées sont : <strong>{highPriorities.slice(0, 3).map(p => p.label).join(", ")}</strong>.</p>
              )}
              {watchList.length > 0 && (
                <p>{watchList.length} élève{watchList.length > 1 ? "s nécessitent" : " nécessite"} une attention particulière.</p>
              )}
              {groups.length > 0 && (
                <p>{groups.length} groupe{groups.length > 1 ? "s de besoin ont été" : " de besoin a été"} constitué{groups.length > 1 ? "s" : ""}.</p>
              )}
              {resources.length > 0 && (
                <p>{resources.length} élève{resources.length > 1 ? "s ressources identifiés" : " ressource identifié"} : {resources.map(r => r.learner.first_name).join(", ")}.</p>
              )}
            </div>
          </section>
        )}

        {/* 2. Priorités collectives */}
        {highPriorities.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold border-b border-border pb-2">2. Priorités collectives</h2>
            <div className="space-y-2">
              {highPriorities.map(p => (
                <div key={p.key} className="border border-border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-semibold text-sm">{p.label}</span>
                    <span className={`text-xs font-body font-medium ${PRIORITY_COLOR[p.priority]}`}>
                      Priorité {p.priority} · {p.weakCount} élève{p.weakCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  {p.risk && <p className="text-xs font-body text-muted-foreground"><span className="font-medium">Risque :</span> {p.risk}</p>}
                  {p.action && <p className="text-xs font-body text-foreground"><span className="font-medium">Action :</span> {p.action}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Vue matrice */}
        {lastObs && learners.length > 0 && (
          <section className="space-y-3 print-break">
            <h2 className="font-heading text-lg font-bold border-b border-border pb-2">3. Vue matrice des compétences</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-3 py-2 font-heading font-semibold min-w-[100px]">Apprenant</th>
                    {criteria.slice(0, 8).map(c => (
                      <th key={c.key} className="text-center px-1.5 py-2 font-body font-medium text-muted-foreground" title={c.label}>{c.short_label}</th>
                    ))}
                    <th className="text-left px-3 py-2 font-body font-medium text-muted-foreground">Profil</th>
                  </tr>
                </thead>
                <tbody>
                  {learners.map(l => {
                    const data = obsMap[l.id] || {};
                    const { main } = computeTags(data, subject);
                    const mainMeta = TAG_META[main];
                    return (
                      <tr key={l.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-1.5 font-body font-medium">{l.first_name}</td>
                        {criteria.slice(0, 8).map(c => (
                          <td key={c.key} className="px-1 py-1 text-center">
                            <CompetencyBadge level={data[c.key] || "non observé"} size="sm" />
                          </td>
                        ))}
                        <td className="px-3 py-1.5">
                          {mainMeta && <span className={`text-xs px-1.5 py-0.5 rounded border font-body ${mainMeta.color}`}>{mainMeta.label}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 4. Groupes de besoin */}
        {groups.length > 0 && (
          <section className="space-y-3 print-break">
            <h2 className="font-heading text-lg font-bold border-b border-border pb-2">4. Groupes de besoin</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {groups.map(g => {
                const memberIds = (() => { try { return JSON.parse(g.learner_ids_json || "[]"); } catch { return []; } })();
                const names = memberIds.map(id => learnerMap[id]?.first_name).filter(Boolean);
                const notes = g.teacher_notes || "";
                const durationMatch = notes.match(/Durée suggérée\s*:\s*([^.]+)/);
                const successMatch = notes.match(/Indicateur\s*:\s*([^.]+)/);
                return (
                  <div key={g.id} className="border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading font-semibold text-sm">{g.group_name}</h3>
                      <span className="text-xs text-muted-foreground font-body">{names.length} élève{names.length > 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-xs font-body font-medium">{names.join(", ")}</p>
                    {g.recommended_activity && <p className="text-xs font-body text-muted-foreground border-t border-border pt-1.5">Activité : {g.recommended_activity}</p>}
                    {durationMatch && <p className="text-xs font-body text-muted-foreground">Durée : {durationMatch[1].trim()}</p>}
                    {successMatch && <p className="text-xs font-body text-foreground">Indicateur : {successMatch[1].trim()}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. Élèves à surveiller */}
        {watchList.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold border-b border-border pb-2">5. Élèves nécessitant une attention particulière</h2>
            <div className="space-y-2">
              {watchList.map((a, i) => (
                <div key={i} className="border border-border rounded-lg p-3 flex items-start gap-3">
                  <span className="text-base leading-none mt-0.5 shrink-0">{a.icon}</span>
                  <div>
                    <p className="font-body font-semibold text-sm">{a.learner.first_name} <span className="font-normal text-muted-foreground">— {a.label}</span></p>
                    <p className="text-xs font-body text-foreground/80 mt-0.5">{a.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. Plan de séance */}
        {planData && (
          <section className="space-y-3 print-break">
            <h2 className="font-heading text-lg font-bold border-b border-border pb-2">6. Plan de séance différenciée</h2>
            <div className="space-y-3">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-xs font-body font-medium text-primary mb-1">Objectif commun</p>
                <p className="text-sm font-body">{planData.objectif_commun}</p>
              </div>
              {planData.demarrage && (
                <div className="border border-border rounded-xl p-3">
                  <p className="text-xs font-body font-medium mb-1">Démarrage collectif ({planData.demarrage.duree})</p>
                  <p className="text-sm font-body">{planData.demarrage.activite}</p>
                </div>
              )}
              {planData.travail_groupes?.map((g, i) => (
                <div key={i} className="border border-border rounded-xl p-3 space-y-1.5">
                  <p className="font-heading font-semibold text-sm">{g.groupe} {g.duree && <span className="text-xs font-body font-normal text-muted-foreground">({g.duree})</span>}</p>
                  <p className="text-xs font-body"><span className="font-medium">Activité : </span>{g.activite}</p>
                  <p className="text-xs font-body"><span className="font-medium">Consigne : </span>{g.consigne}</p>
                  <p className="text-xs font-body text-muted-foreground"><span className="font-medium">Rôle prof : </span>{g.role_prof}</p>
                </div>
              ))}
              {planData.mise_en_commun && (
                <div className="border border-border rounded-xl p-3">
                  <p className="text-xs font-body font-medium mb-1">Mise en commun ({planData.mise_en_commun.duree})</p>
                  <p className="text-sm font-body">{planData.mise_en_commun.activite}</p>
                </div>
              )}
              {planData.trace_ecrite && (
                <div className="border border-border rounded-xl p-3">
                  <p className="text-xs font-body font-medium mb-1">Trace écrite</p>
                  <p className="text-sm font-body">{planData.trace_ecrite}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 7. Liste apprenants */}
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-bold border-b border-border pb-2">7. Liste des apprenants</h2>
          <table className="w-full text-xs border border-border rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 font-heading font-semibold">Prénom</th>
                <th className="text-left px-3 py-2 font-body font-medium text-muted-foreground">Langue</th>
                <th className="text-left px-3 py-2 font-body font-medium text-muted-foreground">Niveau</th>
                <th className="text-left px-3 py-2 font-body font-medium text-muted-foreground">Profil</th>
              </tr>
            </thead>
            <tbody>
              {learners.map(l => {
                const data = obsMap[l.id] || {};
                const { main } = computeTags(data);
                const mainMeta = TAG_META[main];
                return (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 font-body font-medium">{l.first_name}</td>
                    <td className="px-3 py-1.5 font-body text-muted-foreground">{l.main_language || "—"}</td>
                    <td className="px-3 py-1.5 font-body">{l.initial_level_estimate || "—"}</td>
                    <td className="px-3 py-1.5">{mainMeta && <span className={`text-xs px-1.5 py-0.5 rounded border font-body ${mainMeta.color}`}>{mainMeta.label}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <div className="border-t border-border pt-4 text-center text-xs text-muted-foreground font-body space-y-1">
          <p>ClassMap Studio — Carte pédagogique personnalisée, non officielle.</p>
          <p>{cls?.name} · {cls?.level_label} · {cls?.context_type} · {learners.length} apprenant{learners.length !== 1 ? "s" : ""} · {today}</p>
        </div>
      </div>
    </>
  );
}