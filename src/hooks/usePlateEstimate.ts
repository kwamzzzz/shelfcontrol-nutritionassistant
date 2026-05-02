import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

export interface PlateItem {
  name: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "high" | "medium" | "low";
}

export interface PlateEstimate {
  items: PlateItem[];
  total: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  notes: string;
}

const downscaleImage = (file: File, maxSize = 1024): Promise<{ base64: string; mime: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not available"));
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1] ?? "";
        resolve({ base64, mime: "image/jpeg" });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

export const usePlateEstimate = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [estimate, setEstimate] = useState<PlateEstimate | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (file: File, opts: { country?: string; cuisinePreferences?: string[] }) => {
      setIsAnalyzing(true);
      setError(null);
      setEstimate(null);
      try {
        setPreviewUrl(URL.createObjectURL(file));
        const { base64, mime } = await downscaleImage(file);
        const { data, error: fnError } = await supabase.functions.invoke("estimate-plate", {
          body: {
            image_base64: base64,
            mime_type: mime,
            country: opts.country?.trim() || undefined,
            cuisine_preferences: opts.cuisinePreferences ?? [],
          },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        setEstimate(data as PlateEstimate);
      } catch (err: any) {
        setError(err?.message ?? "Failed to analyze plate");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setEstimate(null);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }, [previewUrl]);

  const saveAsConsumption = useCallback(async () => {
    if (!estimate || !user) return;
    setIsSaving(true);
    setError(null);
    try {
      for (const it of estimate.items) {
        // Find or create an items row with the AI's nutrition data baked in
        const { data: existing } = await supabase
          .from("items")
          .select("id")
          .eq("user_id", user.id)
          .ilike("name", it.name)
          .limit(1)
          .maybeSingle();

        let itemId = existing?.id;
        if (!itemId) {
          const { data: created, error: createErr } = await supabase
            .from("items")
            .insert({
              user_id: user.id,
              name: it.name,
              category: "AI estimate",
              default_unit: "serving",
              nutrition_basis: "per_unit",
              calories_per_unit: it.calories,
              protein_g: it.protein_g,
              carbs_g: it.carbs_g,
              fat_g: it.fat_g,
            } as any)
            .select("id")
            .single();
          if (createErr) throw createErr;
          itemId = created!.id;
        }

        const { error: logErr } = await supabase.from("consumption_logs").insert({
          user_id: user.id,
          item_id: itemId,
          quantity: 1,
        } as any);
        if (logErr) throw logErr;
      }
      qc.invalidateQueries({ queryKey: ["consumption_logs"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      reset();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [estimate, user, qc, reset]);

  return { estimate, previewUrl, isAnalyzing, isSaving, error, analyze, reset, saveAsConsumption };
};
