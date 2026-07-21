import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ParsedLine } from "@/lib/purchase-parser";

interface ReceiptItem {
  name: string;
  quantity: number | null;
  quantity_unit: string | null;
  weight: number | null;
  weight_unit: string | null;
  price: number | null;
  notes: string | null;
}

export interface ScannedReceipt {
  storeName: string | null;
  purchasedAt: string | null;
  items: ParsedLine[];
}

// Larger than the plate estimator (1024) so small receipt print survives compression.
const downscaleImage = (file: File, maxSize = 1600): Promise<{ base64: string; mime: string }> =>
  new Promise((resolve, reject) => {
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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve({ base64: dataUrl.split(",")[1] ?? "", mime: "image/jpeg" });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export const useReceiptScan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (file: File): Promise<ScannedReceipt | null> => {
    setIsScanning(true);
    setError(null);
    try {
      const { base64, mime } = await downscaleImage(file);
      const { data, error: fnError } = await supabase.functions.invoke("scan-receipt", {
        body: { image_base64: base64, mime_type: mime },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const items: ParsedLine[] = (data?.items ?? []).map((it: ReceiptItem) => ({
        name: it.name ?? "",
        quantity: it.quantity ?? null,
        quantityUnit: it.quantity_unit ?? null,
        weight: it.weight ?? null,
        weightUnit: it.weight_unit ?? null,
        price: it.price ?? null,
        notes: it.notes ?? null,
        raw: it.name ?? "",
      }));

      return { storeName: data?.store_name ?? null, purchasedAt: data?.purchased_at ?? null, items };
    } catch (err: any) {
      setError(err?.message ?? "Failed to scan receipt");
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  return { scan, isScanning, error, setError };
};
