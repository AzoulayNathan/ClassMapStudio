import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Eye, Map, Layers, ClipboardList, FileText, Users, Trash2, Pencil, AlertTriangle, TrendingDown, Printer } from "lucide-react";
import StatCard from "../components/StatCard";
import CompetencyBadge from "../components/CompetencyBadge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useClassSubject } from "@/hooks/useClassSubject";
import { computeCollectivePriorities, computeAlerts, buildObsMap } from "../lib/map-engine";

export default function ClassProfile() {
  const { classId } = useParams();
  const queryClient = useQueryClient();
  const { classGroup: cls, subject, isLoading } = useClassSubject(classId);

  const { data: learners = [] } = useQuery({
    queryKey: ["learners", classId],
    queryFn: () => base44.entities.ClassLearner.filter({ class_id: classId, status: "active" }),
  });

  const { data: observations = [] } = useQuery({
    queryKey: ["observations", classId],
    queryFn: () => base44.entities.ClassObservation.filter({ class_id: classId }, "-created_date"),
  });

  const lastCompletedObs = observations.find(o => o.status === "completed");

  const { data: learnerObs = [] } = useQuery({
    queryKey: ["learner-obs-profile", lastCompletedObs?.id],
    queryFn: () => lastCompletedObs ? base44.entities.LearnerObservation.filter({ observation_id: lastCompletedObs.id }) : [],
    enabled: !!lastCompletedObs,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["groups", classId],
    queryFn: () => base44.entities.NeedGroup.filter({ class_id: classId, status: "active" }),
  });

  const obsMap = buildObsMap(learnerObs, subject);

  const priorities = computeCollectivePriorities(learners, obsMap, subject);
  const alerts = computeAlerts(learners, obsMap, subject);
  const topPriorities = priorities.filter(p => p.priority === "forte" || p.priority === "moyenne").slice(0, 3);
  const watchAlerts = alerts.filter(a => a.type !== "eleve_ressource").slice(0, 4);

  const deleteLearner = useMutation({
    mutationFn: (id) => base44.entities.ClassLearner.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["learners", classId] }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!cls) return <div className="text-center py-16 text-muted-foreground font-body">Groupe introuvable.</div>;

  const lastObs = observations[0];
  const completedObs = observations.filter(o => o.status === "completed").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link to="/classes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="font-heading text-2xl font-bold">{cls.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground font-body">
              {subject?.name && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-medium">{subject.name}</span>}
              {cls.level_label && <span className="bg-muted px-2 py-0.5 rounded-md text-xs">{cls.level_label}</span>}
              {cls.context_type && <span>{cls.context_type}</span>}
              {cls.main_goal && <span>· {cls.main_goal}</span>}
            </div>
          </div>
        </div>
        <Link to={`/classes/${classId}/print`}>
          <Button variant="outline" size="sm" className="font-body gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Exporter
          </Button>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { to: `/classes/${classId}/add-learners`, icon: Plus, label: "Ajouter apprenant" },
          { to: `/classes/${classId}/observe`, icon: Eye, label: "Observation" },
          { to: `/classes/${classId}/map`, icon: Map, label: "Carte du groupe" },
          { to: `/classes/${classId}/groups`, icon: Layers, label: "Groupes" },
          { to: `/classes/${classId}/session-plan`, icon: ClipboardList, label: "Plan / atelier" },
          { to: `/classes/${classId}/reports`, icon: FileText, label: "Rapports" },
        ].map(a => (
          <Link key={a.to} to={a.to}>
            <div className="bg-card border border-border rounded-xl p-4 text-center hover:shadow-md hover:border-primary/20 transition-all group">
              <a.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs font-body font-medium text-foreground">{a.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Apprenants" value={learners.length} />
        <StatCard icon={Eye} label="Observations" value={observations.filter(o => o.status === "completed").length} />
        <StatCard icon={Layers} label="Groupes actifs" value={groups.length} />
        <StatCard label="Dernière obs." value={lastCompletedObs ? new Date(lastCompletedObs.observation_date || lastCompletedObs.created_date).toLocaleDateString("fr-FR") : "—"} />
      </div>

      {/* Class summary — priorities & alerts */}
      {lastCompletedObs && (topPriorities.length > 0 || watchAlerts.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {topPriorities.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-amber-500" /> Priorités collectives</h2>
              {topPriorities.map(p => (
                <div key={p.key} className="flex items-center justify-between">
                  <span className="text-sm font-body">{p.short}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-body px-2 py-0.5 rounded-full border ${p.priority === "forte" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>{p.priority}</span>
                    <span className="text-xs text-muted-foreground font-body">{p.weakCount} élève{p.weakCount > 1 ? "s" : ""}</span>
                  </div>
                </div>
              ))}
              <Link to={`/classes/${classId}/map`}><Button variant="outline" size="sm" className="w-full text-xs font-body">Voir la carte complète</Button></Link>
            </div>
          )}
          {watchAlerts.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Élèves à surveiller</h2>
              {watchAlerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">{a.icon}</span>
                  <div>
                    <Link to={`/learners/${a.learner.id}`} className="text-sm font-body font-medium hover:text-primary transition-colors">{a.learner.first_name}</Link>
                    <p className="text-xs text-muted-foreground font-body">{a.label}</p>
                  </div>
                </div>
              ))}
              <Link to={`/classes/${classId}/map`}><Button variant="outline" size="sm" className="w-full text-xs font-body">Voir tous les alertes</Button></Link>
            </div>
          )}
        </div>
      )}

      {/* Learners table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold">Apprenants</h2>
          <Link to={`/classes/${classId}/add-learners`}>
            <Button variant="outline" size="sm" className="font-body gap-1"><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
          </Link>
        </div>
        {learners.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground font-body mb-4">Aucun apprenant dans ce groupe.</p>
            <Link to={`/classes/${classId}/add-learners`}>
              <Button className="font-body gap-2"><Plus className="h-4 w-4" /> Ajouter des apprenants</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nom</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Langue</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Niveau</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Confiance</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Autonomie</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {learners.map(l => (
                    <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/learners/${l.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {l.first_name}{l.display_name ? ` (${l.display_name})` : ""}
                        </Link>
                        {l.age && <span className="text-xs text-muted-foreground ml-1.5">{l.age} ans</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{l.main_language || "—"}</td>
                      <td className="px-4 py-3 hidden md:table-cell">{l.initial_level_estimate || "—"}</td>
                      <td className="px-4 py-3 hidden lg:table-cell"><CompetencyBadge level={l.confidence_label || "non observé"} /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><CompetencyBadge level={l.autonomy_label || "non observé"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link to={`/learners/${l.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button></Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer {l.first_name} ?</AlertDialogTitle>
                                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteLearner.mutate(l.id)}>Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Recent observations */}
      {observations.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-semibold mb-4">Dernières observations</h2>
          <div className="space-y-2">
            {observations.slice(0, 5).map(obs => (
              <Link key={obs.id} to={`/classes/${classId}/observe/${obs.id}`}>
                <div className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${obs.status === "completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <div>
                      <span className="font-body font-medium text-sm">{obs.observation_type === "quick" ? "Rapide" : obs.observation_type === "standard" ? "Standard" : "Complète"}</span>
                      <span className="text-xs text-muted-foreground ml-2">{new Date(obs.observation_date || obs.created_date).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                  <span className="text-xs font-body text-muted-foreground">{obs.status === "completed" ? "Terminée" : "En cours"}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}