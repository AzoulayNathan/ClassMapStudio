import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useClassSubject } from "@/hooks/useClassSubject";
import { getActiveCompetencies } from "@/lib/map-engine";
import { payloadToScores } from "@/lib/observation-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import CompetencyBadge from "../components/CompetencyBadge";

export default function LearnerProfile() {
  const { learnerId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);

  const { data: learner, isLoading } = useQuery({
    queryKey: ["learner", learnerId],
    queryFn: () => base44.entities.ClassLearner.get(learnerId),
  });

  const { subject } = useClassSubject(learner?.class_id);

  const { data: learnerObs = [] } = useQuery({
    queryKey: ["learner-all-obs", learnerId],
    queryFn: () => base44.entities.LearnerObservation.filter({ learner_id: learnerId }, "-created_date", 5),
  });

  useEffect(() => { if (learner && !form) setForm({ ...learner }); }, [learner, form]);

  const updateMut = useMutation({
    mutationFn: (data) => base44.entities.ClassLearner.update(learnerId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["learner", learnerId] }); toast.success("Apprenant mis à jour"); },
  });

  const deleteMut = useMutation({
    mutationFn: () => base44.entities.ClassLearner.delete(learnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      if (learner?.class_id) navigate(`/classes/${learner.class_id}`);
      else navigate("/dashboard");
    },
  });

  const lastObs = learnerObs[0];
  const obsScores = useMemo(() => {
    if (!lastObs || !subject) return [];
    const scores = payloadToScores(lastObs, subject.competencies);
    return getActiveCompetencies(subject, "standard")
      .filter(c => scores[c.key])
      .map(c => ({ label: c.short_label || c.label, value: scores[c.key] }));
  }, [lastObs, subject]);

  if (isLoading || !form) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const { id, created_date, updated_date, created_by_id, ...data } = form;
    updateMut.mutate({
      ...data,
      background_info: data.background_info || data.main_language,
      initial_profile_label: data.initial_profile_label || data.initial_level_estimate,
      main_language: data.background_info || data.main_language,
      initial_level_estimate: data.initial_profile_label || data.initial_level_estimate,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={learner.class_id ? `/classes/${learner.class_id}` : "/dashboard"}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="font-heading text-2xl font-bold">{learner.first_name}</h1>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive font-body gap-1"><Trash2 className="h-3.5 w-3.5" /> Supprimer</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer {learner.first_name} ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMut.mutate()}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {lastObs && obsScores.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-heading font-semibold text-sm mb-3">Dernière observation{subject?.name ? ` · ${subject.name}` : ""}</h2>
          <div className="flex flex-wrap gap-2">
            {obsScores.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-body">{label}:</span>
                <CompetencyBadge level={value || "non observé"} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-heading font-semibold">Informations</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="font-body text-sm">Prénom *</Label>
            <Input value={form.first_name || ""} onChange={e => set("first_name", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="font-body text-sm">Nom affiché</Label>
            <Input value={form.display_name || ""} onChange={e => set("display_name", e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="font-body text-sm">Âge</Label>
            <Input type="number" value={form.age || ""} onChange={e => set("age", e.target.value ? Number(e.target.value) : null)} className="mt-1" />
          </div>
          <div>
            <Label className="font-body text-sm">Contexte / parcours</Label>
            <Input value={form.background_info || form.main_language || ""} onChange={e => set("background_info", e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="font-body text-sm">Profil initial</Label>
          <Input value={form.initial_profile_label || form.initial_level_estimate || ""} onChange={e => set("initial_profile_label", e.target.value)} placeholder="Ex : débutant, 3e, A1..." className="mt-1" />
        </div>
        <div>
          <Label className="font-body text-sm">Notes</Label>
          <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} className="mt-1" rows={3} />
        </div>
        <Button onClick={handleSave} disabled={updateMut.isPending} className="w-full font-body gap-1">
          <Save className="h-4 w-4" /> {updateMut.isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
