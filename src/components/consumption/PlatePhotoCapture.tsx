import { useRef, useState } from "react";
import { usePlateEstimate } from "@/hooks/usePlateEstimate";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Plane, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  triggerVariant?: "default" | "outline" | "ghost";
  triggerLabel?: string;
}

const PlatePhotoCapture = ({ triggerVariant = "default", triggerLabel = "Snap a plate" }: Props) => {
  const { user } = useAuth();
  const { estimate, previewUrl, isAnalyzing, isSaving, error, analyze, reset, saveAsConsumption } = usePlateEstimate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("");
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ["profile-for-plate", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("cuisine_preferences")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const handleFile = (file: File) => {
    analyze(file, {
      country: country || undefined,
      cuisinePreferences: profile?.cuisine_preferences ?? [],
    });
  };

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next) {
      reset();
      setCountry("");
    }
  };

  const handleSave = async () => {
    try {
      await saveAsConsumption();
      toast({ title: "Logged", description: "Plate items added to your consumption diary." });
      setOpen(false);
      setCountry("");
    } catch (err: any) {
      toast({ title: "Failed to save", description: err?.message ?? "Try again", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className="gap-2 rounded-xl">
          <Camera className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Plate estimate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              <Plane className="h-3 w-3" /> Travel mode (optional)
            </label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Country you're in (e.g. Italy)"
              className="rounded-xl"
              disabled={isAnalyzing || isSaving}
            />
            <p className="text-[11px] text-muted-foreground/80 mt-1">
              Helps the model recognise local dishes and account for typical preparations.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          {!previewUrl && !estimate && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="w-full rounded-xl gap-2 h-24"
              variant="outline"
            >
              <Camera className="h-5 w-5" />
              {isAnalyzing ? "Analysing..." : "Take or pick a photo"}
            </Button>
          )}

          {previewUrl && (
            <div className="rounded-xl overflow-hidden border">
              <img src={previewUrl} alt="Plate preview" className="w-full max-h-64 object-cover" />
            </div>
          )}

          {isAnalyzing && (
            <p className="text-sm text-muted-foreground text-center">Estimating calories — this can take 5–10 seconds…</p>
          )}

          {error && (
            <Card className="border-destructive/40">
              <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
            </Card>
          )}

          {estimate && (
            <Card className="rounded-xl">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">Total</p>
                  <p className="text-xl font-bold tabular-nums">
                    {Math.round(estimate.total.calories)} <span className="text-xs font-normal text-muted-foreground">cal</span>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(estimate.total.protein_g)}g P · {Math.round(estimate.total.carbs_g)}g C · {Math.round(estimate.total.fat_g)}g F
                </p>
                <div className="border-t pt-2 space-y-1.5">
                  {estimate.items.map((it, idx) => (
                    <div key={idx} className="flex items-baseline justify-between text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{it.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {it.portion} · {it.confidence} confidence
                        </p>
                      </div>
                      <p className="tabular-nums text-foreground shrink-0 ml-2">{Math.round(it.calories)} cal</p>
                    </div>
                  ))}
                </div>
                {estimate.notes && (
                  <p className="text-[11px] text-muted-foreground/80 border-t pt-2">{estimate.notes}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {estimate && (
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving} className="rounded-xl">
              Retake
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!estimate || isSaving}
            className="rounded-xl"
          >
            {isSaving ? "Saving..." : "Log to diary"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlatePhotoCapture;
