import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Grid3x3, Users, BarChart3, AlertTriangle, Layers } from "lucide-react";
import CompetencyBadge from "../components/CompetencyBadge";
import { useClassSubject } from "@/hooks/useClassSubject";
import {
  getActiveCompetencies, computeTags, computeCollectivePriorities, computeAlerts,
  TAG_META, computeReliability, buildObsMap,
} from "../lib/map-engine";

const PRIORITY_COLOR = { forte: "bg-red-100 text-red-700 border-red-200", moyenne: "bg-amber-100 text-amber-700 border-amber-200", faible: "bg-emerald-100 text-emerald-700 border-emerald-200" };
const ALERT_COLOR = {
  données_insuffisantes: "border-gray-200 bg-gray-50",
  soutien_prioritaire: "border-red-200 bg-red-50",
  eleve_ressource: "border-emerald-200 bg-emerald-50",
  confiance_basse: "border-amber-200 bg-amber-50",
};
const RELIABILITY_COLOR = {
  "carte solide": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "assez fiable": "bg-blue-100 text-blue-800 border-blue-200",
  "carte partielle": "bg-amber-100 text-amber-800 border-amber-200",
  "à compléter": "bg-gray-100 text-gray-600 border-gray-200",
};

const TABS = [
  { id: "matrix",     label: "Matrice",      icon: Grid3x3 },
  { id: "profiles",   label: "Profils",      icon: Users },
  { id: "priorities", label: "Priorités",    icon: BarChart3 },
  { id: "watch",      label: "À surveiller", icon: AlertTriangle },
  { id: "groups",     label: "Groupes",      icon: Layers },
];

export default function ClassMap() {
  const { classId } = useParams();
  const [tab, setTab] = useState("matrix");
  const { classGroup: cls, subject } = useClassSubject(classId);
  const criteria = getActiveCompetencies(subject, "complete").map(c => ({ ...c, short: c.short_label }));
  const { data: learners = [] } = useQuery({
    queryKey: ["learners", classId],
    queryFn: () => base44.entities.ClassLearner.filter({ class_id: classId, status: "active" }),
  });
  const { data: observations = [] } = useQuery({
    queryKey: ["observations", classId],
    queryFn: () => base44.entities.ClassObservation.filter({ class_id: classId, status: "completed" }, "-created_date", 1),
  });
  const lastObs = observations[0];
  const { data: learnerObs = [] } = useQuery({
    queryKey: ["learner-obs-map", lastObs?.id],
    queryFn: () => lastObs ? base44.entities.LearnerObservation.filter({ observation_id: lastObs.id }) : [],
    enabled: !!lastObs,
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["groups", classId],
    queryFn: () => base44.entities.NeedGroup.filter({ class_id: classId, status: "active" }),
  });
  const { data: mapResults = [] } = useQuery({
    queryKey: ["map-result", classId],
    queryFn: () => base44.entities.ClassMapResult.filter({ class_id: classId }, "-created_date", 1),
  });

  const obsMap = buildObsMap(learnerObs, subject);

  const priorities = computeCollectivePriorities(learners, obsMap, subject);
  const alerts = computeAlerts(learners, obsMap, subject);
  const mapResult = mapResults[0] || null;
  const reliability = computeReliability(learners, obsMap, subject);

  // Build summary text fallback
  const strongPriorities = priorities.filter(p => p.priority === "forte");
  const watchList = alerts.filter(a => a.type !== "eleve_ressource");
  const fallbackSummary = [
    learners.length > 0 ? `${learners.length} apprenant${learners.length > 1 ? "s" : ""} observé${learners.length > 1 ? "s" : ""}.` : "",
    strongPriorities.length > 0 ? `Priorités fortes : ${strongPriorities.slice(0, 2).map(p => p.label).join(", ")}.` : "",
    watchList.length > 0 ? `${watchList.length} apprenant${watchList.length > 1 ? "s" : ""} à surveiller.` : "",
  ].filter(Boolean).join(" ");

  let parsedRisks = [];
  try { parsedRisks = mapResult?.risks_json ? JSON.parse(mapResult.risks_json) : []; } catch { /* empty */ }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/classes/${classId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="font-heading text-2xl font-bold">Carte du groupe</h1>
            <p className="text-sm text-muted-foreground font-body">{cls?.name}{subject?.name ? ` · ${subject.name}` : ""} · {learners.length} apprenants</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastObs && (
            <span className="text-xs text-muted-foreground font-body bg-muted rounded-full px-3 py-1">
              Observation du {new Date(lastObs.observation_date || lastObs.created_date).toLocaleDateString("fr-FR")}
            </span>
          )}
          {lastObs && (
            <span className={`text-xs font-body font-medium px-2.5 py-1 rounded-full border ${RELIABILITY_COLOR[reliability.label] || RELIABILITY_COLOR["à compléter"]}`}>
              {reliability.label} · {reliability.pct}%
            </span>
          )}
          {lastObs && (
            <div className="flex items-center gap-2">
              <Link to={`/classes/${classId}/groups`}><Button variant="outline" size="sm" className="font-body">Groupes</Button></Link>
              <Link to={`/classes/${classId}/print`}><Button variant="outline" size="sm" className="font-body">Imprimer</Button></Link>
            </div>
          )}
        </div>
      </div>

      {/* Synthesis */}
      {lastObs && (mapResult?.class_summary || fallbackSummary) && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
          <p className="text-sm font-body text-foreground leading-relaxed">
            {mapResult?.class_summary || fallbackSummary}
          </p>
          {parsedRisks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {parsedRisks.map(r => (
                <span key={r} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-2 py-0.5 font-body">{r}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {!lastObs ? (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-body mb-4">Aucune observation terminée.</p>
          <Link to={`/classes/${classId}/observe`}><Button className="font-body">Lancer une observation</Button></Link>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto bg-muted/50 p-1 rounded-xl">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-body font-medium whitespace-nowrap transition-all ${
                  tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
                {t.id === "watch" && alerts.length > 0 && (
                  <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{alerts.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── TAB: Matrice */}
          {tab === "matrix" && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-heading font-medium sticky left-0 bg-muted/50 z-10 min-w-[130px]">Apprenant</th>
                      {criteria.map(c => (
                        <th key={c.key} className="text-center px-2 py-3 font-body font-medium text-muted-foreground text-xs min-w-[78px]" title={c.label}>{c.short_label}</th>
                      ))}
                      <th className="text-left px-3 py-3 font-body font-medium text-muted-foreground text-xs min-w-[180px]">Profil principal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {learners.map(l => {
                      const data = obsMap[l.id] || {};
                      const { main, secondary } = computeTags(data, subject);
                      const mainMeta = TAG_META[main];
                      return (
                        <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-body font-medium sticky left-0 bg-card z-10">
                            <Link to={`/learners/${l.id}`} className="hover:text-primary transition-colors">{l.first_name}</Link>
                          </td>
                          {criteria.map(c => (
                            <td key={c.key} className="px-2 py-2 text-center">
                              <CompetencyBadge level={data[c.key] || "non observé"} size="sm" />
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {mainMeta && (
                                <span className={`text-xs px-2 py-0.5 rounded-md border font-body ${mainMeta.color}`}>{mainMeta.label}</span>
                              )}
                              {secondary.slice(0, 2).map(t => {
                                const m = TAG_META[t];
                                return m ? <span key={t} className={`text-xs px-1.5 py-0.5 rounded border font-body opacity-75 ${m.color}`}>{m.label}</span> : null;
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB: Profils */}
          {tab === "profiles" && (
            <div className="space-y-5">
              {Object.entries(TAG_META).map(([tagKey, meta]) => {
                const matching = learners.filter(l => {
                  const { main, secondary } = computeTags(obsMap[l.id] || {}, subject);
                  return main === tagKey || secondary.includes(tagKey);
                });
                if (matching.length === 0) return null;
                return (
                  <div key={tagKey} className="border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium font-body px-2.5 py-1 rounded-md border ${meta.color}`}>{meta.label}</span>
                        <span className="text-xs text-muted-foreground font-body">{matching.length} apprenant{matching.length > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {matching.map(l => (
                        <Link key={l.id} to={`/learners/${l.id}`} className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5 hover:border-primary/30 transition-colors">
                          <span className="font-body text-sm font-medium">{l.first_name}</span>
                          {(l.initial_profile_label || l.initial_level_estimate) && <span className="text-xs text-muted-foreground">{l.initial_profile_label || l.initial_level_estimate}</span>}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TAB: Priorités */}
          {tab === "priorities" && (
            <div className="space-y-4">
              {priorities.map(p => {
                const total = learners.length || 1;
                const pctSolide = (p.dist.solide / total) * 100;
                const pctCorrect = (p.dist.correct / total) * 100;
                const pctFragile = (p.dist.fragile / total) * 100;
                const pctBloque = (p.dist.bloqué / total) * 100;
                return (
                  <div key={p.key} className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="font-heading font-semibold text-sm">{p.label}</h3>
                        {p.weakCount > 0 && (
                          <p className="text-xs text-muted-foreground font-body">{p.weakCount} apprenant{p.weakCount > 1 ? "s" : ""} fragile{p.weakCount > 1 ? "s" : ""}/bloqué{p.weakCount > 1 ? "s" : ""}</p>
                        )}
                      </div>
                      <span className={`text-xs font-body font-medium px-2.5 py-1 rounded-full border ${PRIORITY_COLOR[p.priority]}`}>
                        Priorité {p.priority}
                      </span>
                    </div>
                    <div className="h-4 rounded-full overflow-hidden flex bg-muted">
                      {pctSolide > 0 && <div className="bg-emerald-400 h-full transition-all" style={{ width: `${pctSolide}%` }} title={`Solide: ${p.dist.solide}`} />}
                      {pctCorrect > 0 && <div className="bg-blue-400 h-full transition-all" style={{ width: `${pctCorrect}%` }} title={`Correct: ${p.dist.correct}`} />}
                      {pctFragile > 0 && <div className="bg-amber-400 h-full transition-all" style={{ width: `${pctFragile}%` }} title={`Fragile: ${p.dist.fragile}`} />}
                      {pctBloque > 0 && <div className="bg-rose-400 h-full transition-all" style={{ width: `${pctBloque}%` }} title={`Bloqué: ${p.dist.bloqué}`} />}
                    </div>
                    <div className="flex gap-3 text-xs font-body text-muted-foreground">
                      {[["solide", "bg-emerald-400"], ["correct", "bg-blue-400"], ["fragile", "bg-amber-400"], ["bloqué", "bg-rose-400"], ["non observé", "bg-gray-300"]].map(([lv, bg]) => (
                        p.dist[lv] > 0 && (
                          <span key={lv} className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${bg}`} />{lv}: {p.dist[lv]}
                          </span>
                        )
                      ))}
                    </div>
                    {p.priority !== "faible" && p.risk && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                        <p className="text-xs font-body"><span className="font-medium text-amber-700">Risque :</span> {p.risk}</p>
                        <p className="text-xs font-body"><span className="font-medium text-primary">Action :</span> {p.action}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TAB: À surveiller */}
          {tab === "watch" && (
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <p className="text-muted-foreground font-body">Aucune alerte pour cette observation.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground font-body">{alerts.length} alerte{alerts.length > 1 ? "s" : ""} détectée{alerts.length > 1 ? "s" : ""}</p>
                  {alerts.map((a, i) => (
                    <div key={i} className={`border rounded-xl p-4 space-y-2 ${ALERT_COLOR[a.type] || "bg-card border-border"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none">{a.icon}</span>
                        <div>
                          <Link to={`/learners/${a.learner.id}`} className="font-heading font-semibold text-sm hover:text-primary transition-colors">{a.learner.first_name}</Link>
                          <span className="text-xs text-muted-foreground font-body ml-2">{a.label}</span>
                        </div>
                      </div>
                      <p className="text-xs font-body text-foreground/80 pl-7">{a.action}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── TAB: Groupes */}
          {tab === "groups" && (
            <div className="space-y-4">
              {groups.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-body mb-4">Aucun groupe généré.</p>
                  <Link to={`/classes/${classId}/groups`}><Button className="font-body">Générer les groupes</Button></Link>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground font-body">{groups.length} groupe{groups.length > 1 ? "s" : ""} actif{groups.length > 1 ? "s" : ""}</p>
                    <Link to={`/classes/${classId}/groups`}><Button variant="outline" size="sm" className="font-body">Gérer les groupes</Button></Link>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {groups.map(g => {
                      const memberIds = (() => { try { return JSON.parse(g.learner_ids_json || "[]"); } catch { return []; } })();
                      const memberNames = memberIds.map(id => learners.find(l => l.id === id)?.first_name).filter(Boolean);
                      return (
                        <div key={g.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-heading font-semibold text-sm">{g.group_name}</h3>
                            <span className="text-xs text-muted-foreground font-body">{memberIds.length} apprenant{memberIds.length > 1 ? "s" : ""}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {memberNames.map(n => (
                              <span key={n} className="bg-muted text-foreground text-xs px-2 py-0.5 rounded font-body">{n}</span>
                            ))}
                          </div>
                          {g.recommended_activity && (
                            <p className="text-xs text-muted-foreground font-body border-t border-border pt-2">{g.recommended_activity}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}