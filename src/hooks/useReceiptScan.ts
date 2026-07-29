import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ParsedLine } from "@/lib/purchase-parser";
import { prepareReceiptImages } from "@/lib/receipt-images";

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

type ScanStage = "preparing" | "reading" | null;

export const useReceiptScan = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState<ScanStage>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (files: File | File[]): Promise<ScannedReceipt | null> => {
    setIsScanning(true);
    setScanStage("preparing");
    setError(null);
    try {
      const selectedFiles = Array.isArray(files) ? files : [files];
      if (selectedFiles.length === 0) throw new Error("Choose at least one receipt image.");

      const images = await prepareReceiptImages(selectedFiles);
      setScanStage("reading");
      const { data, error: fnError } = await supabase.functions.invoke("scan-receipt", {
        body: {
          images: images.map(({ base64, mime, sourceIndex, part, totalParts }) => ({
            image_base64: base64,
            mime_type: mime,
            source_index: sourceIndex,
            part,
            total_parts: totalParts,
          })),
        },
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to scan receipt");
      return null;
    } finally {
      setIsScanning(false);
      setScanStage(null);
    }
  }, []);

  return { scan, isScanning, scanStage, error, setError };
};
