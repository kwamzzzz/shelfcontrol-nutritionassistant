import { Check, Loader2, Pencil, PlayCircle, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  steps: string[];
  onOpenStepByStep: () => void;
  onSaveSteps?: (steps: string[]) => Promise<void> | void;
  saving?: boolean;
}

const InstructionsCard = ({ steps, onOpenStepByStep, onSaveSteps, saving = false }: Props) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(steps);

  useEffect(() => {
    setDraft(steps);
  }, [steps]);

  const hasSteps = steps.length > 0;

  const handleSave = async () => {
    if (!onSaveSteps) return;
    const cleaned = draft.map((s) => s.trim()).filter(Boolean);
    await onSaveSteps(cleaned);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">Edit Instructions</h3>
          <span className="text-xs text-muted-foreground">{draft.length} steps</span>
        </div>

        <ol className="mt-4 space-y-3">
          {draft.map((s, i) => (
            <li key={i} className="flex gap-2 items-start">
              <div className="shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center mt-1">
                {i + 1}
              </div>
              <Textarea
                value={s}
                onChange={(e) =>
                  setDraft((d) => d.map((v, idx) => (idx === i ? e.target.value : v)))
                }
                placeholder={`Step ${i + 1}`}
                rows={2}
                className="flex-1 text-sm resize-y"
              />
              <button
                onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))}
                className="mt-1 h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Remove step"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ol>

        <button
          onClick={() => setDraft((d) => [...d, ""])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Add step
        </button>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm py-2 hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </button>
          <button
            onClick={() => {
              setDraft(steps);
              setEditing(false);
            }}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 text-sm py-2 hover:bg-muted disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground">Instructions</h3>
          {hasSteps && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {steps.length} steps
            </span>
          )}
        </div>
        {onSaveSteps && (
          <button
            onClick={() => setEditing(true)}
            title={hasSteps ? "Edit instructions" : "Add instructions"}
            className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {hasSteps ? (
        <>
          <ol className="mt-4 space-y-3.5">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <div className="shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </div>
                <p className="text-sm text-foreground leading-relaxed pt-0.5">{s}</p>
              </li>
            ))}
          </ol>

          <div className="mt-5">
            <Button variant="outline" size="sm" onClick={onOpenStepByStep} className="gap-2 rounded-full w-full sm:w-auto">
              <PlayCircle className="h-4 w-4" /> View Step-by-Step Mode
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center text-center py-8">
          <p className="text-sm font-medium text-foreground">No instructions yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
            Add step-by-step instructions to guide you through cooking this recipe.
          </p>
          {onSaveSteps && (
            <button
              onClick={() => {
                setDraft([""]);
                setEditing(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm px-4 py-2 hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Instructions
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default InstructionsCard;