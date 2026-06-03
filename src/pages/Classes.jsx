import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, ArrowRight, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Classes() {
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => base44.entities.ClassGroup.list("-created_date"),
  });

  const { data: learners = [] } = useQuery({
    queryKey: ["all-learners"],
    queryFn: () => base44.entities.ClassLearner.filter({ status: "active" }),
  });

  const active = classes.filter(c => c.status !== "archived");
  const archived = classes.filter(c => c.status === "archived");

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Mes groupes</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">{active.length} groupe{active.length !== 1 ? "s" : ""} actif{active.length !== 1 ? "s" : ""}</p>
        </div>
        <Link to="/classes/new">
          <Button className="font-body gap-2"><Plus className="h-4 w-4" /> Nouvelle carte</Button>
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground font-body mb-4">Aucun groupe pour l'instant.</p>
          <Link to="/classes/new"><Button className="font-body gap-2"><Plus className="h-4 w-4" /> Créer une carte</Button></Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map(cls => {
            const count = learners.filter(l => l.class_id === cls.id).length;
            return (
              <Link key={cls.id} to={`/classes/${cls.id}`} className="block group">
                <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-heading font-semibold group-hover:text-primary transition-colors">{cls.name}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="space-y-1 text-sm font-body text-muted-foreground">
                    <p>{count} apprenant{count !== 1 ? "s" : ""}</p>
                    {cls.subject_name && <p className="text-primary font-medium">{cls.subject_name}</p>}
                    {cls.context_type && <p>{cls.context_type}</p>}
                    {cls.main_goal && <p>Objectif : {cls.main_goal}</p>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {archived.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <Archive className="h-4 w-4" /> Archives
          </h2>
          <div className="space-y-2">
            {archived.map(cls => (
              <Link key={cls.id} to={`/classes/${cls.id}`}>
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
                  {cls.name} — {cls.level_label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}