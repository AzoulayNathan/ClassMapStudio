import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { listTemplates, createCustomSubject } from "@/api/subjects";
import { seedDemoData } from "@/lib/demo-seed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const PREFS_KEY = "classmap_prefs";

const defaultPrefs = {
  default_obs_type: "standard",
  max_group_size: "5",
  include_resource_learners: "oui",
  include_defi_group: "oui",
  session_duration: "45",
  report_format: "complet",
};

function loadPrefs() {
  try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }; } catch { return defaultPrefs; }
}

export default function Settings() {
  const [user, setUser] = useState(null);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [saved, setSaved] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [seeding, setSeeding] = useState(false);
  const [customForm, setCustomForm] = useState({ name: "", description: "", competencies: "", context: "", goal: "" });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    listTemplates().then(setTemplates).catch(() => {});
  }, []);

  const setPref = (key, value) => setPrefs(p => ({ ...p, [key]: value }));

  const handleSave = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCreateSubject = async () => {
    if (!customForm.name.trim()) { toast.error("Nom de matière requis"); return; }
    try {
      await createCustomSubject({
        name: customForm.name,
        description: customForm.description || customForm.goal,
        category: "custom",
        competenciesText: customForm.competencies,
        createdBy: user?.id,
      });
      toast.success("Matière personnalisée créée");
      setCustomForm({ name: "", description: "", competencies: "", context: "", goal: "" });
      listTemplates().then(setTemplates);
    } catch {
      toast.error("Impossible de créer la matière (vérifiez Supabase)");
    }
  };

  const handleSeedDemos = async () => {
    setSeeding(true);
    try {
      const groups = await seedDemoData();
      toast.success(`${groups.length} groupes démo créés`);
    } catch (e) {
      toast.error("Erreur lors du chargement des démos");
      console.error(e);
    }
    setSeeding(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">Matières, modèles et préférences</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-heading font-semibold">Profil</h2>
        {user ? (
          <>
            <div>
              <Label className="font-body text-sm">Email</Label>
              <Input value={user.email || ""} disabled className="mt-1 bg-muted font-body" />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground font-body">Chargement…</p>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-heading font-semibold">Matières et modèles</h2>
        <p className="text-sm text-muted-foreground font-body">Modèles disponibles pour créer une carte.</p>
        <ul className="space-y-2">
          {templates.filter(t => t.slug !== "custom_blank").map(t => (
            <li key={t.slug} className="text-sm font-body flex justify-between border border-border rounded-lg px-3 py-2">
              <span className="font-medium">{t.name}</span>
              <span className="text-muted-foreground text-xs">{t.category}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-heading font-semibold">Créer une matière personnalisée</h2>
        <div>
          <Label>Nom de la matière</Label>
          <Input value={customForm.name} onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))} className="mt-1.5" placeholder="Ex : Yoga, Théâtre..." />
        </div>
        <div>
          <Label>Compétences (une par ligne)</Label>
          <Textarea value={customForm.competencies} onChange={e => setCustomForm(f => ({ ...f, competencies: e.target.value }))} className="mt-1.5" rows={4} placeholder="Posture&#10;Respiration&#10;Concentration" />
        </div>
        <div>
          <Label>Objectif général</Label>
          <Input value={customForm.goal} onChange={e => setCustomForm(f => ({ ...f, goal: e.target.value }))} className="mt-1.5" />
        </div>
        <Button onClick={handleCreateSubject} className="w-full font-body">Créer la matière</Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="font-heading font-semibold">Préférences pédagogiques</h2>
        <div>
          <Label className="font-body text-sm">Type d'observation par défaut</Label>
          <Select value={prefs.default_obs_type} onValueChange={v => setPref("default_obs_type", v)}>
            <SelectTrigger className="mt-1.5 font-body"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quick">Rapide</SelectItem>
              <SelectItem value="standard">Standard (recommandé)</SelectItem>
              <SelectItem value="complete">Complète</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="font-body text-sm">Taille max par groupe</Label>
          <Select value={prefs.max_group_size} onValueChange={v => setPref("max_group_size", v)}>
            <SelectTrigger className="mt-1.5 font-body"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n} apprenants</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} className="w-full font-body">
          {saved ? "✓ Préférences sauvegardées" : "Sauvegarder les préférences"}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
        <h2 className="font-heading font-semibold">Données de démo</h2>
        <p className="text-sm text-muted-foreground font-body">Crée 4 groupes exemples (FLE, Maths, Informatique, Chant) avec observations et groupes.</p>
        <Button variant="outline" onClick={handleSeedDemos} disabled={seeding} className="w-full font-body">
          {seeding ? "Création..." : "Charger les démos"}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-2">
        <h2 className="font-heading font-semibold">À propos</h2>
        <p className="font-body text-sm text-muted-foreground">
          ClassMap Studio aide les enseignants, tuteurs, coaches et formateurs à visualiser les besoins d'un groupe d'apprenants et organiser des groupes de travail adaptés — quelle que soit la matière.
        </p>
      </div>

      <div className="text-center">
        <Button variant="outline" onClick={() => base44.auth.logout()} className="font-body">Se déconnecter</Button>
      </div>
    </div>
  );
}
