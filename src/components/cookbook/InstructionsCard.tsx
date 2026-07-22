import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  steps: string[];
  onOpenStepByStep: () => void;
}

const InstructionsCard = ({ steps, onOpenStepByStep }: Props) => (
  <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
    <div className="flex items-center gap-2">
      <h3 className="font-medium text-foreground">Instructions</h3>
      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        {steps.length} steps
      </span>
    </div>

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
  </div>
);

export default InstructionsCard;