import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Flame, LeafyGreen, DollarSign, Beef } from "lucide-react";
import { CHALLENGE_TEMPLATES, type ChallengeType, useChallenges } from "@/hooks/useChallenges";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

const TYPE_ICONS: Record<ChallengeType, React.ReactNode> = {
  protein_goal: <Beef className="h-5 w-5" />,
  consistency_streak: <Flame className="h-5 w-5" />,
  zero_waste_week: <LeafyGreen className="h-5 w-5" />,
  budget_champion: <DollarSign className="h-5 w-5" />,
};

const TYPE_COLORS: Record<ChallengeType, string> = {
  protein_goal: "text-accent",
  consistency_streak: "text-warning",
  zero_waste_week: "text-success",
  budget_champion: "text-primary",
};

const CreateChallengeDialog = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"select" | "configure">("select");
  const [selectedType, setSelectedType] = useState<ChallengeType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [targetValue, setTargetValue] = useState<string>("");
  const { createChallenge } = useChallenges();

  const template = CHALLENGE_TEMPLATES.find((t) => t.type === selectedType);

  const handleSelect = (type: ChallengeType) => {
    const tmpl = CHALLENGE_TEMPLATES.find((t) => t.type === type)!;
    setSelectedType(type);
    setTitle(tmpl.title);
    setDescription(tmpl.description);
    setEndDate(format(addDays(new Date(startDate), tmpl.defaultDays), "yyyy-MM-dd"));
    setTargetValue(tmpl.defaultTarget?.toString() ?? "");
    setStep("configure");
  };

  const handleCreate = async () => {
    if (!selectedType || !title) return;
    try {
      await createChallenge.mutateAsync({
        title,
        type: selectedType,
        description,
        start_date: startDate,
        end_date: endDate,
        target_value: targetValue ? Number(targetValue) : null,
      });
      toast.success("Challenge created!");
      setOpen(false);
      resetForm();
    } catch {
      toast.error("Failed to create challenge");
    }
  };

  const resetForm = () => {
    setStep("select");
    setSelectedType(null);
    setTitle("");
    setDescription("");
    setTargetValue("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />New Challenge</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[Outfit,var(--font-heading),sans-serif]">
            {step === "select" ? "Choose a Challenge" : "Configure Challenge"}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {CHALLENGE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.type}
                onClick={() => handleSelect(tmpl.type)}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border bg-card hover:bg-accent/10 hover:border-primary/30 transition-all text-left"
              >
                <div className={TYPE_COLORS[tmpl.type]}>{TYPE_ICONS[tmpl.type]}</div>
                <span className="font-semibold text-sm">{tmpl.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</span>
                <Badge variant="outline" className="text-[10px] mt-1">{tmpl.scoringNote}</Badge>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <div className={TYPE_COLORS[selectedType!]}>{TYPE_ICONS[selectedType!]}</div>
              <Badge variant="secondary" className="text-xs">{template?.title}</Badge>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {template?.defaultTarget !== null && (
              <div className="space-y-2">
                <Label>Target ({template?.targetUnit})</Label>
                <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
              </div>
            )}

            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <strong>Scoring:</strong> {template?.scoringNote}
            </p>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>Back</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={createChallenge.isPending}>
                {createChallenge.isPending ? "Creating…" : "Create Challenge"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateChallengeDialog;
