import { useState } from "react";
import { useSymptoms, useAddSymptom, useDeleteSymptom } from "@/hooks/useSymptoms";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Smile, Zap, Activity, Trash2, HeartPulse } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type ScaleField = "mood" | "energy" | "digestion";

interface ScaleConfig {
  field: ScaleField;
  label: string;
  icon: typeof Smile;
  emojis: [string, string, string, string, string];
}

const SCALES: ScaleConfig[] = [
  { field: "mood", label: "Mood", icon: Smile, emojis: ["😞", "🙁", "😐", "🙂", "😄"] },
  { field: "energy", label: "Energy", icon: Zap, emojis: ["🪫", "😴", "⚡", "💪", "🔥"] },
  { field: "digestion", label: "Digestion", icon: Activity, emojis: ["🤢", "😣", "😐", "👍", "✨"] },
];

const SymptomLog = () => {
  const { data: symptoms, isLoading } = useSymptoms(20);
  const addSymptom = useAddSymptom();
  const deleteSymptom = useDeleteSymptom();
  const { toast } = useToast();

  const [values, setValues] = useState<Record<ScaleField, number | null>>({
    mood: null,
    energy: null,
    digestion: null,
  });
  const [notes, setNotes] = useState("");

  const setScale = (field: ScaleField, value: number) => {
    setValues((prev) => ({ ...prev, [field]: prev[field] === value ? null : value }));
  };

  const reset = () => {
    setValues({ mood: null, energy: null, digestion: null });
    setNotes("");
  };

  const handleSave = async () => {
    if (!values.mood && !values.energy && !values.digestion && !notes.trim()) {
      toast({
        title: "Nothing to save",
        description: "Pick at least one rating or write a note.",
        variant: "destructive",
      });
      return;
    }
    try {
      await addSymptom.mutateAsync({
        mood: values.mood,
        energy: values.energy,
        digestion: values.digestion,
        notes: notes.trim() || null,
      });
      reset();
      toast({ title: "Logged", description: "Symptom captured." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">How you feel — feeds your AI coach with context.</p>
      </div>

      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-4 space-y-4">
          {SCALES.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.field}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{s.label}</p>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const selected = values[s.field] === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setScale(s.field, n)}
                        aria-pressed={selected}
                        aria-label={`${s.label} ${n} of 5`}
                        className={`flex-1 h-11 rounded-xl text-lg transition-colors ${
                          selected
                            ? "bg-primary/15 ring-2 ring-primary/40"
                            : "bg-muted/40 hover:bg-muted"
                        }`}
                      >
                        {s.emojis[n - 1]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div>
            <p className="text-sm font-medium mb-2">Notes (optional)</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bloated after lunch, slept poorly, headache..."
              className="rounded-xl"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={reset} disabled={addSymptom.isPending}>
              Clear
            </Button>
            <Button onClick={handleSave} disabled={addSymptom.isPending} className="rounded-xl">
              {addSymptom.isPending ? "Saving..." : "Log Symptom"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Recent</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !symptoms?.length ? (
          <p className="text-sm text-muted-foreground">No symptoms logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {symptoms.map((s) => (
              <li key={s.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(s.recorded_at), "EEE d MMM, HH:mm")}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-sm">
                      {SCALES.map((scale) => {
                        const v = s[scale.field];
                        if (!v) return null;
                        return (
                          <span key={scale.field} className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs">{scale.label}:</span>
                            <span>{scale.emojis[v - 1]}</span>
                          </span>
                        );
                      })}
                    </div>
                    {s.notes && <p className="text-sm text-foreground mt-1.5">{s.notes}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSymptom.mutate(s.id)}
                    aria-label="Delete symptom"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SymptomLog;
