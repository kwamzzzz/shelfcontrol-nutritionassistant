import { useState } from "react";
import { useRecipeImport, type ImportedRecipe } from "@/hooks/useRecipeImport";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, LinkIcon, FileText, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RecipeImportDialog = () => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const { parsed, setParsed, isLoading, isSaving, error, fetchAndParse, reset, saveToLibrary } = useRecipeImport();
  const { toast } = useToast();

  const isNotRecipe = parsed?.name?.startsWith("[NOT A RECIPE]");

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next) {
      reset();
      setUrl("");
      setText("");
    }
  };

  const handleImport = (mode: "url" | "text") => {
    if (mode === "url") {
      const trimmed = url.trim();
      if (!trimmed) return;
      fetchAndParse({ url: trimmed });
    } else {
      const trimmed = text.trim();
      if (!trimmed) return;
      fetchAndParse({ text: trimmed });
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    try {
      await saveToLibrary();
      toast({ title: "Saved", description: `${parsed.name} added to recipes.` });
      setOpen(false);
      setUrl("");
      setText("");
    } catch (err: any) {
      toast({ title: "Failed to save", description: err?.message ?? "Try again", variant: "destructive" });
    }
  };

  const updateField = <K extends keyof ImportedRecipe>(key: K, value: ImportedRecipe[K]) => {
    if (!parsed) return;
    setParsed({ ...parsed, [key]: value });
  };

  const updateIngredient = (idx: number, field: "name" | "quantity" | "unit", value: string) => {
    if (!parsed) return;
    const next = [...parsed.ingredients];
    if (field === "quantity") {
      const n = Number(value);
      next[idx] = { ...next[idx], quantity: Number.isFinite(n) ? n : null };
    } else {
      next[idx] = { ...next[idx], [field]: value || null } as any;
    }
    setParsed({ ...parsed, ingredients: next });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-xl">
          <Wand2 className="h-4 w-4" />
          Import recipe
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Import a recipe
          </DialogTitle>
        </DialogHeader>

        {!parsed && (
          <Tabs defaultValue="url">
            <TabsList className="bg-muted/50 rounded-xl">
              <TabsTrigger value="url" className="rounded-lg gap-1.5 text-xs"><LinkIcon className="h-3.5 w-3.5" /> URL</TabsTrigger>
              <TabsTrigger value="text" className="rounded-lg gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Paste text</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="space-y-3 mt-4">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="rounded-xl"
                disabled={isLoading}
              />
              <p className="text-[11px] text-muted-foreground">
                Works best with recipe blogs that include structured data. Falls back to AI parsing.
              </p>
              <Button onClick={() => handleImport("url")} disabled={isLoading || !url.trim()} className="rounded-xl">
                {isLoading ? "Importing..." : "Fetch & parse"}
              </Button>
            </TabsContent>
            <TabsContent value="text" className="space-y-3 mt-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste a recipe here — Instagram caption, screenshot text, anywhere."
                rows={8}
                className="rounded-xl"
                disabled={isLoading}
              />
              <Button onClick={() => handleImport("text")} disabled={isLoading || !text.trim()} className="rounded-xl">
                {isLoading ? "Parsing..." : "Parse with AI"}
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {parsed && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {isNotRecipe && (
              <Card className="border-amber-500/40">
                <CardContent className="p-3 text-sm text-amber-700">
                  The model didn't see a recipe in this content. You can still edit the fields below or try a different source.
                </CardContent>
              </Card>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Recipe name</label>
              <Input
                value={parsed.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="rounded-xl mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Servings</label>
              <Input
                type="number"
                min="1"
                value={parsed.servings ?? ""}
                onChange={(e) => updateField("servings", e.target.value ? Number(e.target.value) : null)}
                className="rounded-xl mt-1 max-w-[140px]"
                placeholder="—"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Ingredients ({parsed.ingredients.length})</label>
              <div className="mt-2 space-y-1.5">
                {parsed.ingredients.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No ingredients parsed.</p>
                ) : (
                  parsed.ingredients.map((ing, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1.5">
                      <Input
                        className="col-span-7 rounded-lg text-sm"
                        value={ing.name}
                        onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                      />
                      <Input
                        type="number"
                        step="any"
                        className="col-span-2 rounded-lg text-sm"
                        value={ing.quantity ?? ""}
                        onChange={(e) => updateIngredient(idx, "quantity", e.target.value)}
                        placeholder="qty"
                      />
                      <Input
                        className="col-span-3 rounded-lg text-sm"
                        value={ing.unit ?? ""}
                        onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
                        placeholder="unit"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Instructions</label>
              <Textarea
                value={parsed.instructions ?? ""}
                onChange={(e) => updateField("instructions", e.target.value)}
                rows={6}
                className="rounded-xl mt-1"
              />
            </div>

            {parsed.source && (
              <p className="text-[11px] text-muted-foreground">
                Parsed via <span className="font-medium">{parsed.source.method === "json-ld" ? "structured data" : "AI"}</span>
                {parsed.source.url ? ` from ${new URL(parsed.source.url).hostname}` : ""}.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {parsed && (
            <Button variant="ghost" onClick={() => { reset(); }} disabled={isSaving}>
              Try another
            </Button>
          )}
          {parsed && (
            <Button onClick={handleSave} disabled={isSaving || !parsed.name.trim()} className="rounded-xl">
              {isSaving ? "Saving..." : "Save to recipes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeImportDialog;
