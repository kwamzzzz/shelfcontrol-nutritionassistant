import { useMemo, useState, MouseEvent, KeyboardEvent } from "react";
import { Check, Plus, Tag as TagIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useUpdateRecipeTags } from "@/hooks/useRecipes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export const DEFAULT_TAGS = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Dessert",
  "Soup",
  "Salad",
  "Side",
  "Quick & Easy",
  "Vegetarian",
];

interface Props {
  recipeId: string;
  tags: string[];
  knownTags?: string[];
  compact?: boolean;
}

const RecipeTagEditor = ({ recipeId, tags, knownTags = [], compact = false }: Props) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const updateTags = useUpdateRecipeTags();
  const { toast } = useToast();

  const options = useMemo(() => {
    const set = new Set<string>([...DEFAULT_TAGS, ...knownTags, ...tags]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [knownTags, tags]);

  const stop = (e: MouseEvent) => e.stopPropagation();

  const toggle = async (tag: string) => {
    const has = tags.includes(tag);
    const next = has ? tags.filter((t) => t !== tag) : [...tags, tag];
    try {
      await updateTags.mutateAsync({ id: recipeId, tags: next });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const addCustom = async () => {
    const t = input.trim();
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setInput("");
      return;
    }
    try {
      await updateTags.mutateAsync({ id: recipeId, tags: [...tags, t] });
      setInput("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={stop}>
        <button
          type="button"
          aria-label="Edit tags"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-dashed border-border/70 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors",
            compact && "h-6",
          )}
        >
          <TagIcon className="h-3 w-3" />
          {tags.length === 0 ? "Tag" : "Edit"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-3"
        onClick={stop}
        onKeyDown={stop as any}
      >
        <div className="text-xs font-medium text-foreground mb-2">Tags</div>

        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => toggle(t)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs hover:bg-primary/20 transition-colors"
              >
                {t}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        <div className="max-h-48 overflow-y-auto -mx-1 px-1 space-y-0.5">
          {options.map((t) => {
            const active = tags.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggle(t)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors",
                  active && "text-primary",
                )}
              >
                <span>{t}</span>
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-1.5">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Add custom tag"
            className="h-8 text-xs"
          />
          <button
            onClick={addCustom}
            disabled={!input.trim() || updateTags.isPending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            aria-label="Add tag"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RecipeTagEditor;