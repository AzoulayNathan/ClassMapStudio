import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Eye, Map, Layers, ClipboardList, ArrowRight, AlertCircle, BookOpen, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function ClassWorkflowCard({ cls, learnerCount, lastCompletedObs, hasGroups, hasSessionPlan, hasDraftObs }) {
  // Determine next step
  let nextStep = null;
  if (learnerCount === 0) {
    nextStep = { label: "Ajouter des apprenants", to: `/classes/${cls.id}/add-learners`, icon: Plus, color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200" };
  } else if (!lastCompletedObs) {
    nextStep = { label: "Lancer une observation", to: `/classes/${cls.id}/observe`, icon: Eye, color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200" };
  } else if (!hasGroups) {
    nextStep = { label: "Générer les groupes", to: `/classes/${cls.id}/groups`, icon: Layers, color: "text-purple-600", bgColor: "bg-purple-50 border-purple-200" };
  } else if (!hasSessionPlan) {
    nextStep = { label: "Préparer la séance", to: `/classes/${cls.id}/session-plan`, icon: ClipboardList, color: "text-orange-600", bgColor: "bg-orange-50 border-orange-200" };
  } else {
    nextStep = { label: "Groupe prêt", to: `/classes/${cls.id}`, icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-50 border-emerald-200" };
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/20 transition-all">
      {/* Card header — click to go to class */}
      <Link to={`/classes/${cls.id}`} className="block p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-heading font-semibold text-foreground">{cls.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {cls.subject_name && <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md font-body">{cls.subject_name}</span>}
              {cls.level_label && <span className="bg-muted text-xs px-2 py-0.5 rounded-md font-body">{cls.level_label}</span>}
              {cls.context_type && <span className="text-xs text-muted-foreground font-body">{cls.context_type}</span>}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
          <span className="flex items-center gap-1">
            <span className="font-medium text-foreground">{learnerCount}</span> apprenant{learnerCount !== 1 ? "s" : ""}
          </span>
          {lastCompletedObs && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {new Date(lastCompletedObs.observation_date || lastCompletedObs.created_date).toLocaleDateString("fr-FR")}
            </span>
          )}
          {hasDraftObs && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3 w-3" /> obs. en cours
            </span>
          )}
        </div>
      </Link>

      {/* Next step action */}
      <div className={`px-4 py-2.5 border-t border-border flex items-center justify-between ${nextStep.bgColor}`}>
        <div className={`flex items-center gap-1.5 text-xs font-body font-medium ${nextStep.color}`}>
          <nextStep.icon className="h-3.5 w-3.5" />
          {nextStep.label}
        </div>
        <Link to={nextStep.to}>
          <Button size="sm" variant="ghost" className={`h-6 text-xs font-body px-2 ${nextStep.color}`}>
            Ouvrir →
          </Button>
        </Link>
      </div>

      {/* Secondary actions */}
      {(hasGroups || lastCompletedObs) && (
        <div className="px-4 py-2.5 border-t border-border flex items-center gap-2 bg-muted/20">
          {lastCompletedObs && (
            <Link to={`/classes/${cls.id}/map`} className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground transition-colors">
              <Map className="h-3 w-3" /> Carte
            </Link>
          )}
          {hasGroups && (
            <Link to={`/classes/${cls.id}/groups`} className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground transition-colors">
              <Layers className="h-3 w-3" /> Groupes
            </Link>
          )}
          {hasSessionPlan && (
            <Link to={`/classes/${cls.id}/session-plan`} className="flex items-center gap-1 text-xs font-body text-muted-foreground hover:text-foreground transition-colors">
              <BookOpen className="h-3 w-3" /> Séance
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => base44.entities.ClassGroup.filter({ status: "active" }, "-created_date"),
  });
  const { data: learners = [] } = useQuery({
    queryKey: ["all-learners"],
    queryFn: () => base44.entities.ClassLearner.filter({ status: "active" }),
  });
  const { data: observations = [] } = useQuery({
    queryKey: ["all-observations"],
    queryFn: () => base44.entities.ClassObservation.list("-created_date", 100),
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["all-groups"],
    queryFn: () => base44.entities.NeedGroup.filter({ status: "active" }),
  });
  const { data: sessionPlans = [] } = useQuery({
    queryKey: ["all-session-plans"],
    queryFn: () => base44.entities.ClassReport.filter({ report_type: "session_plan" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-primary/50 animate-spin" />
      </div>
    );
  }

  const draftObs = observations.filter(o => o.status === "draft");
  const activeClasses = classes.filter(c => c.status === "active");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            {activeClasses.length > 0
              ? `${activeClasses.length} groupe${activeClasses.length > 1 ? "s" : ""} actif${activeClasses.length > 1 ? "s" : ""} · ${learners.length} apprenant${learners.length !== 1 ? "s" : ""}`
              : "Commencez par créer une carte"}
          </p>
        </div>
        <Link to="/classes/new">
          <Button className="font-body gap-2">
            <Plus className="h-4 w-4" /> Nouvelle carte
          </Button>
        </Link>
      </div>

      {/* Draft observations banner */}
      {draftObs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="font-body font-medium text-sm text-amber-800">
              {draftObs.length} observation{draftObs.length > 1 ? "s" : ""} en cours
            </span>
          </div>
          <div className="space-y-1.5">
            {draftObs.map(obs => {
              const cls = classes.find(c => c.id === obs.class_id);
              return (
                <Link key={obs.id} to={`/classes/${obs.class_id}/observe/${obs.id}`} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 hover:border-amber-300 border border-amber-100 transition-all">
                  <span className="font-body text-sm">{cls?.name || "Classe"} — observation {obs.observation_type === "quick" ? "rapide" : "standard"}</span>
                  <Button variant="outline" size="sm" className="h-6 text-xs font-body">Continuer</Button>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Classes */}
      {activeClasses.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-heading font-semibold text-lg mb-2">Aucun groupe pour l'instant</h3>
          <p className="text-sm text-muted-foreground font-body mb-6 max-w-sm mx-auto">
            Créez votre première carte pour visualiser les besoins de vos apprenants.
          </p>
          <Link to="/classes/new">
            <Button className="font-body gap-2">
              <Plus className="h-4 w-4" /> Créer une carte
            </Button>
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="font-heading text-base font-semibold mb-4 text-muted-foreground uppercase tracking-wide text-xs">Mes groupes</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeClasses.map(cls => {
              const classLearners = learners.filter(l => l.class_id === cls.id);
              const classObs = observations.filter(o => o.class_id === cls.id);
              const lastCompletedObs = classObs.find(o => o.status === "completed");
              const hasDraftObs = classObs.some(o => o.status === "draft");
              const hasGroups = groups.some(g => g.class_id === cls.id);
              const hasSessionPlan = sessionPlans.some(p => p.class_id === cls.id);
              return (
                <ClassWorkflowCard
                  key={cls.id}
                  cls={cls}
                  learnerCount={classLearners.length}
                  lastCompletedObs={lastCompletedObs}
                  hasDraftObs={hasDraftObs}
                  hasGroups={hasGroups}
                  hasSessionPlan={hasSessionPlan}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}