import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { listTemplates, templateToSubject } from "@/api/subjects";
import { buildGroupSubjectPayload } from "@/lib/subject-resolver";
import { getDefaultSubjectTemplates } from "@/lib/subject-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Calculator, Code, Music, BookOpen, FlaskConical, Languages, Plus, Check } from "lucide-react";

const ICONS = { Languages, Calculator, Code, Music, BookOpen, FlaskConical, Plus };
const profiles = ["enfants", "ados", "adultes", "mixte"];
const contexts = ["école", "association", "cours privé", "centre de formation", "club", "examen", "autre"];

const STEPS = ["Matière", "Groupe", "Compétences", "Contexte", "Créer"];

export default function NewClass() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState(getDefaultSubjectTemplates());
  const [selectedSlug, setSelectedSlug] = useState(params.get("template") || "");
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customLines, setCustomLines] = useState("");
  const [competencies, setCompetencies] = useState([]);
  const [form, setForm] = useState({ name: "", context_type: "", profile_type: "", main_goal: "", notes: "", level_label: "" });

  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    if (params.get("template") && templates.length) {
      pickTemplate(params.get("template"));
    }
  }, [params, templates]);

  const pickTemplate = (slug) => {
    if (slug === "custom") {
      setCustomMode(true);
      setSelectedSlug("custom_blank");
      setCompetencies([]);
      return;
    }
    setCustomMode(false);
    setSelectedSlug(slug);
    const tpl = templates.find(t => t.slug === slug);
    if (tpl) {
      const subject = templateToSubject(tpl);
      setCompetencies(subject.competencies.map(c => ({ ...c, enabled: c.enabled !== false })));
    }
  };

  const selectedTemplate = templates.find(t => t.slug === selectedSlug);

  const updateComp = (idx, field, value) => {
    setCompetencies(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const addComp = () => {
    const n = competencies.length + 1;
    setCompetencies(prev => [...prev, {
      key: `custom_${n}`, label: `Compétence ${n}`, short_label: `Comp.${n}`,
      category: "custom", enabled: true, required_in_quick: false,
      required_in_standard: true, required_in_complete: true,
    }]);
  };

  const create = useMutation({
    mutationFn: async () => {
      let tpl = selectedTemplate;
      if (customMode && customName) {
        tpl = {
          name: customName,
          slug: "custom",
          category: "custom",
          competencies_json: customLines.split("\n").filter(Boolean).map((label, i) => ({
            key: `custom_${i + 1}`, label: label.trim(), short_label: label.trim().slice(0, 10),
            category: "custom", enabled: true, required_in_quick: i < 3,
            required_in_standard: true, required_in_complete: true,
          })),
          observation_scale_json: getDefaultSubjectTemplates()[0].observation_scale_json,
          group_templates_json: [],
          report_labels_json: {},
        };
      }
      const subjectPayload = buildGroupSubjectPayload(tpl || selectedTemplate, {
        name: customMode ? customName : undefined,
        competencies: competencies.filter(c => c.enabled !== false),
        ...form,
      });
      return base44.entities.ClassGroup.create({
        ...form,
        ...subjectPayload,
        status: "active",
      });
    },
    onSuccess: (result) => navigate(`/classes/${result.id}`),
  });

  const canNext = () => {
    if (step === 0) return customMode ? customName.trim() : selectedSlug;
    if (step === 1) return form.name.trim();
    if (step === 2) return competencies.filter(c => c.enabled !== false).length >= 1;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Link to="/classes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="font-heading text-2xl font-bold">Nouvelle carte</h1>
          <p className="text-sm text-muted-foreground font-body">Étape {step + 1} — {STEPS[step]}</p>
        </div>
      </div>

      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        {step === 0 && (
          <>
            <p className="text-sm text-muted-foreground font-body">Choisissez une matière ou créez la vôtre.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {templates.filter(t => t.slug !== "custom_blank").map(tpl => {
                const Icon = ICONS[tpl.icon] || BookOpen;
                return (
                  <button
                    key={tpl.slug}
                    type="button"
                    onClick={() => pickTemplate(tpl.slug)}
                    className={`text-left p-4 rounded-xl border transition-colors ${selectedSlug === tpl.slug && !customMode ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                  >
                    <Icon className="h-5 w-5 text-primary mb-2" />
                    <div className="font-heading font-semibold text-sm">{tpl.name}</div>
                    <p className="text-xs text-muted-foreground font-body mt-1">{tpl.description}</p>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => { setCustomMode(true); setSelectedSlug(""); }}
                className={`text-left p-4 rounded-xl border transition-colors ${customMode ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
              >
                <Plus className="h-5 w-5 text-primary mb-2" />
                <div className="font-heading font-semibold text-sm">Créer ma matière</div>
                <p className="text-xs text-muted-foreground font-body mt-1">Définir vos propres compétences</p>
              </button>
            </div>
            {customMode && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <Label>Nom de la matière</Label>
                  <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Ex : Yoga, Théâtre..." className="mt-1.5" />
                </div>
                <div>
                  <Label>Compétences (une par ligne)</Label>
                  <Textarea value={customLines} onChange={e => setCustomLines(e.target.value)} placeholder="Posture&#10;Respiration&#10;Concentration" className="mt-1.5" rows={4} />
                </div>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <Label>Nom du groupe *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex : Groupe maths 3e, Atelier Python..." className="mt-1.5" />
            </div>
            {selectedTemplate && !customMode && (
              <p className="text-sm text-muted-foreground font-body">
                Matière : <strong>{selectedTemplate.name}</strong>
              </p>
            )}
          </>
        )}

        {step === 2 && !customMode && (
          <>
            <p className="text-sm text-muted-foreground font-body">Vérifiez et ajustez les compétences observables.</p>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {competencies.map((c, i) => (
                <div key={c.key} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Checkbox checked={c.enabled !== false} onCheckedChange={v => updateComp(i, "enabled", !!v)} className="mt-1" />
                  <div className="flex-1 grid sm:grid-cols-2 gap-2">
                    <Input value={c.label} onChange={e => updateComp(i, "label", e.target.value)} className="text-sm" />
                    <Input value={c.short_label} onChange={e => updateComp(i, "short_label", e.target.value)} placeholder="Label court" className="text-sm" />
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addComp} className="font-body gap-1"><Plus className="h-3 w-3" /> Ajouter une compétence</Button>
          </>
        )}

        {step === 2 && customMode && (
          <p className="text-sm font-body text-muted-foreground">Les compétences seront créées à partir de votre liste à l'étape 1.</p>
        )}

        {step === 3 && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Profil dominant</Label>
                <Select value={form.profile_type} onValueChange={v => setForm(f => ({ ...f, profile_type: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{profiles.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contexte</Label>
                <Select value={form.context_type} onValueChange={v => setForm(f => ({ ...f, context_type: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{contexts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Objectif principal</Label>
              <Input value={form.main_goal} onChange={e => setForm(f => ({ ...f, main_goal: e.target.value }))} placeholder="Ex : consolider la méthode, sécuriser l'oral..." className="mt-1.5" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1.5" rows={3} />
            </div>
          </>
        )}

        {step === 4 && (
          <div className="text-center py-6 space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-heading font-semibold text-lg">Prêt à créer la carte</h3>
            <p className="text-sm text-muted-foreground font-body">
              Groupe : <strong>{form.name}</strong><br />
              Matière : <strong>{customMode ? customName : selectedTemplate?.name}</strong><br />
              {competencies.filter(c => c.enabled !== false).length || customLines.split("\n").filter(Boolean).length} compétences
            </p>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="font-body">
            Retour
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="font-body gap-1">
              Suivant <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="font-body">
              {create.isPending ? "Création..." : "Créer la carte"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
