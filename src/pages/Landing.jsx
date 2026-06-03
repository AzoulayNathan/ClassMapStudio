import { Link } from "react-router-dom";
import { Map, Users, Eye, Layers, ClipboardList, ArrowRight, CheckCircle, Calculator, Code, Music, BookOpen, FlaskConical, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

const subjectExamples = [
  { icon: Languages, title: "En FLE", desc: "On observe l'oral, les consignes, le vocabulaire." },
  { icon: Calculator, title: "En maths", desc: "On observe le raisonnement, la méthode, le calcul." },
  { icon: Code, title: "En informatique", desc: "On observe la logique, le debugging, la décomposition." },
  { icon: Music, title: "En chant", desc: "On observe la justesse, le rythme, la respiration." },
  { icon: FlaskConical, title: "En sport / sciences", desc: "On observe la technique, le protocole, la coordination." },
  { icon: BookOpen, title: "En soutien scolaire", desc: "On observe la méthode, l'autonomie, la confiance." },
];

const steps = [
  { icon: Users, label: "Choisir une matière", desc: "Modèle ou matière personnalisée" },
  { icon: Eye, label: "Observer le groupe", desc: "Grille adaptée à vos critères" },
  { icon: Map, label: "Visualiser la carte", desc: "Besoins du groupe en un coup d'œil" },
  { icon: Layers, label: "Former les groupes", desc: "Groupes de besoin automatiques" },
  { icon: ClipboardList, label: "Plan de séance / atelier", desc: "Séance adaptée à chaque groupe" },
];

const outputs = [
  "Carte pédagogique personnalisée",
  "Groupes de besoin automatiques",
  "Priorités collectives",
  "Apprenants à surveiller",
  "Plan de séance / atelier différencié",
  "Synthèse exportable",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Map className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-lg">ClassMap Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm" className="font-body">Connexion</Button></Link>
            <Link to="/register"><Button size="sm" className="font-body">Commencer</Button></Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            Créez une carte pédagogique<br />
            <span className="text-primary">adaptée à votre matière.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto mb-10 leading-relaxed">
            ClassMap Studio aide les enseignants et formateurs à visualiser les besoins d'un groupe, créer des catégories d'observation, former des groupes de travail et préparer une séance adaptée.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="font-body text-base px-8 gap-2">
                Créer une carte <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/classes/new?browse=templates">
              <Button variant="outline" size="lg" className="font-body text-base px-8">
                Choisir un modèle
              </Button>
            </Link>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-16">
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80"
            alt="ClassMap Studio — carte pédagogique"
            className="w-full rounded-2xl shadow-xl border border-border/50"
          />
        </div>
      </section>

      <section className="py-20 px-6 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-4">
            Chaque matière a ses propres critères.
          </h2>
          <p className="text-center text-muted-foreground font-body mb-12 max-w-xl mx-auto">
            Une seule app. Des cartes adaptées à chaque matière.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectExamples.map((s, i) => (
              <div key={i} className="bg-background rounded-xl border border-border p-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-heading font-semibold text-sm mb-1">{s.title}</div>
                <p className="font-body text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-12">
            observation → carte → groupes → plan → rapport
          </h2>
          <div className="grid md:grid-cols-5 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="font-heading font-semibold text-sm mb-1">{s.label}</div>
                <p className="text-xs text-muted-foreground font-body">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-card border-y border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-10">Ce que vous obtenez</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-left">
            {outputs.map((o, i) => (
              <div key={i} className="flex items-center gap-3 bg-background rounded-xl border border-border p-4">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-body text-sm text-foreground">{o}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 text-center">
        <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">Prêt à cartographier votre groupe ?</h2>
        <p className="text-muted-foreground font-body mb-8">Créez votre première carte en moins de 2 minutes.</p>
        <Link to="/register">
          <Button size="lg" className="font-body text-base px-8 gap-2">
            Commencer gratuitement <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
