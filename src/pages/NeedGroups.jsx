import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Layers, Wand2, Trash2, Pencil, Plus, Users, Clock,
  Target, BookOpen, ChevronDown, ChevronUp, Archive, UserMinus, UserPlus,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { generateNeedGroups, buildObsMap } from "../lib/map-engine";
import { useClassSubject } from "@/hooks/useClassSubject";

const PRIORITY_BADGE = {
  haute:   "bg-red-100 text-red-700 border-red-200",
  moyenne: "bg-amber-100 text-amber-700 border-amber-200",
  faible:  "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function NeedGroups() {
  const { classId } = useParams();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [addMemberId, setAddMemberId] = useState(null); // groupId being edited for members
  const [generating, setGenerating] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const { classGroup: cls, subject } = useClassSubject(classId);
  const { data: learners = [] } = useQuery({ queryKey: ["learners", classId], queryFn: () => base44.entities.ClassLearner.filter({ class_id: classId, status: "active" }) });
  const { data: observations = [] } = useQuery({ queryKey: ["observations", classId], queryFn: () => base44.entities.ClassObservation.filter({ class_id: classId, status: "completed" }, "-created_date", 1) });
  const lastObs = observations[0];
  const { data: learnerObs = [] } = useQuery({
    queryKey: ["learner-obs-groups", lastObs?.id],
    queryFn: () => lastObs ? base44.entities.LearnerObservation.filter({ observation_id: lastObs.id }) : [],
    enabled: !!lastObs,
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["groups", classId],
    queryFn: () => base44.entities.NeedGroup.filter({ class_id: classId, status: "active" }),
  });

  const obsMap = buildObsMap(learnerObs, subject);
  const learnerMap = {};
  learners.forEach(l => { learnerMap[l.id] = l; });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["groups", classId] });

  const createGroup = useMutation({
    mutationFn: (data) => base44.entities.NeedGroup.create(data),
    onSuccess: invalidate,
  });
  const deleteGroup = useMutation({
    mutationFn: (id) => base44.entities.NeedGroup.delete(id),
    onSuccess: () => { invalidate(); toast.success("Groupe supprimé"); },
  });
  const updateGroup = useMutation({
    mutationFn: ({ id, data }) => base44.entities.NeedGroup.update(id, data),
    onSuccess: invalidate,
  });

  const handleGenerate = async () => {
    if (!lastObs) { toast.error("Aucune observation terminée — lancez une observation d'abord."); return; }
    setGenerating(true);
    const generated = generateNeedGroups(learners, obsMap, subject);
    if (generated.length === 0) { toast.info("Aucun groupe à générer avec les données actuelles."); setGenerating(false); return; }
    for (const g of generated) {
      await createGroup.mutateAsync({
        class_id: classId,
        observation_id: lastObs.id,
        group_name: g.name,
        group_type: g.type,
        priority_competency_key: g.type,
        priority_competency_label: g.name,
        priority_skill: g.type,
        learner_ids_json: JSON.stringify(g.memberIds),
        rationale: `${g.risk} ${g.action}`,
        recommended_activity: g.activity,
        difficulty_level: g.priority,
        teacher_notes: `Durée suggérée : ${g.duration}. Indicateur : ${g.success}. Note : ${g.teacherNote}`,
        status: "active",
      });
    }
    setGenerating(false);
    toast.success(`${generated.length} groupe${generated.length > 1 ? "s" : ""} généré${generated.length > 1 ? "s" : ""}`);
  };

  const removeMember = (group, learnerId) => {
    const ids = getMemberIds(group).filter(id => id !== learnerId);
    updateGroup.mutate({ id: group.id, data: { learner_ids_json: JSON.stringify(ids) } });
  };
  const addMember = (group, learnerId) => {
    const ids = [...new Set([...getMemberIds(group), learnerId])];
    updateGroup.mutate({ id: group.id, data: { learner_ids_json: JSON.stringify(ids) } });
    setAddMemberId(null);
  };
  const archiveGroup = (id) => {
    updateGroup.mutate({ id, data: { status: "archived" } });
    toast.success("Groupe archivé");
  };

  const getMemberIds = (g) => { try { return JSON.parse(g.learner_ids_json || "[]"); } catch { return []; } };

  const handleCreateManual = async () => {
    if (!newGroupName.trim()) return;
    await createGroup.mutateAsync({
      class_id: classId,
      group_name: newGroupName.trim(),
      group_type: "manuel",
      learner_ids_json: "[]",
      status: "active",
    });
    setNewGroupName("");
    setShowNewGroup(false);
    toast.success("Groupe créé");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/classes/${classId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="font-heading text-2xl font-bold">Groupes de besoin</h1>
            <p className="text-sm text-muted-foreground font-body">{cls?.name} · {groups.length} groupe{groups.length !== 1 ? "s" : ""} actif{groups.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewGroup(!showNewGroup)} className="font-body gap-1.5">
            <Plus className="h-4 w-4" /> Groupe manuel
          </Button>
          <Button onClick={handleGenerate} disabled={!lastObs || generating} className="font-body gap-2">
            <Wand2 className="h-4 w-4" /> {generating ? "Génération…" : "Générer"}
          </Button>
        </div>
      </div>

      {/* New group form */}
      {showNewGroup && (
        <div className="bg-card border border-primary/20 rounded-xl p-4 flex gap-2">
          <Input
            placeholder="Nom du groupe…"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateManual()}
            className="font-body"
          />
          <Button onClick={handleCreateManual} className="font-body">Créer</Button>
          <Button variant="ghost" onClick={() => setShowNewGroup(false)} className="font-body">Annuler</Button>
        </div>
      )}

      {/* No obs warning */}
      {!lastObs && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm font-body text-amber-800">
          Aucune observation terminée. <Link to={`/classes/${classId}/observe`} className="underline font-medium">Lancer une observation</Link> pour générer des groupes automatiquement.
        </div>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-body mb-2">Aucun groupe de besoin pour l'instant.</p>
          <p className="text-xs text-muted-foreground font-body mb-5">
            {lastObs ? "Cliquez sur « Générer » pour créer des groupes depuis l'observation." : "Lancez d'abord une observation."}
          </p>
          {lastObs && (
            <Button onClick={handleGenerate} disabled={generating} className="font-body gap-2">
              <Wand2 className="h-4 w-4" /> Générer les groupes
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {groups.map(g => {
            const memberIds = getMemberIds(g);
            const members = memberIds.map(id => learnerMap[id]).filter(Boolean);
            const isExpanded = expandedId === g.id;
            const isEditing = editingId === g.id;
            const isAddingMember = addMemberId === g.id;
            const availableToAdd = learners.filter(l => !memberIds.includes(l.id));

            // Parse teacher notes for display
            const notes = g.teacher_notes || "";
            const durationMatch = notes.match(/Durée suggérée\s*:\s*([^.]+)/);
            const successMatch = notes.match(/Indicateur\s*:\s*([^.]+)/);
            const noteMatch = notes.match(/Note\s*:\s*(.+)/);

            return (
              <div key={g.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Card header */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="text-sm font-body" />
                        <Button size="sm" onClick={() => { updateGroup.mutate({ id: g.id, data: { group_name: editName } }); setEditingId(null); }}>OK</Button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold text-sm leading-tight">{g.group_name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {g.difficulty_level && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${PRIORITY_BADGE[g.difficulty_level] || PRIORITY_BADGE.faible}`}>
                              Priorité {g.difficulty_level}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground font-body flex items-center gap-1">
                            <Users className="h-3 w-3" /> {members.length}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(isEditing ? null : g.id); setEditName(g.group_name); }} title="Renommer">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => archiveGroup(g.id)} title="Archiver">
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce groupe ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteGroup.mutate(g.id)}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Members */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center gap-1 bg-muted rounded-md pl-2 pr-1 py-0.5">
                          <span className="text-xs font-body font-medium">{m.first_name}</span>
                          <button onClick={() => removeMember(g, m.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Retirer">
                            <UserMinus className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setAddMemberId(isAddingMember ? null : g.id)}
                        className="flex items-center gap-1 border border-dashed border-border rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors font-body"
                      >
                        <UserPlus className="h-3 w-3" /> Ajouter
                      </button>
                    </div>
                    {isAddingMember && availableToAdd.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-2 flex flex-wrap gap-1.5">
                        {availableToAdd.map(l => (
                          <button
                            key={l.id}
                            onClick={() => addMember(g, l.id)}
                            className="text-xs bg-card border border-border rounded px-2 py-0.5 font-body hover:border-primary/40 hover:bg-primary/5 transition-colors"
                          >
                            {l.first_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Activity */}
                  {g.recommended_activity && (
                    <div className="bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                      <p className="text-xs font-body font-medium text-primary mb-0.5 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> Activité
                      </p>
                      <p className="text-xs font-body text-foreground">{g.recommended_activity}</p>
                    </div>
                  )}

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : g.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-body transition-colors w-full"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? "Masquer les détails" : "Voir les détails pédagogiques"}
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                    {g.rationale && (
                      <div>
                        <p className="text-xs font-medium font-body text-muted-foreground mb-1">Justification</p>
                        <p className="text-xs font-body">{g.rationale}</p>
                      </div>
                    )}
                    {durationMatch && (
                      <div className="flex items-center gap-2 text-xs font-body">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span><span className="font-medium">Durée :</span> {durationMatch[1].trim()}</span>
                      </div>
                    )}
                    {successMatch && (
                      <div className="flex items-start gap-2 text-xs font-body">
                        <Target className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span><span className="font-medium">Indicateur de réussite :</span> {successMatch[1].trim()}</span>
                      </div>
                    )}
                    {noteMatch && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                        <p className="text-xs font-body font-medium text-amber-800 mb-0.5">Note professeur</p>
                        <p className="text-xs font-body text-amber-900">{noteMatch[1].trim()}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}