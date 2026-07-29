import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Images,
  Loader2,
  Plus,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MAX_RECEIPT_FILES,
  RECEIPT_IMAGE_ACCEPT,
  receiptFileKey,
  selectReceiptFiles,
} from "@/lib/receipt-images";
import { cn } from "@/lib/utils";

interface SelectedReceiptImage {
  file: File;
  id: string;
  previewUrl: string;
}

interface ReceiptImagePickerProps {
  isScanning: boolean;
  scanStage: "preparing" | "reading" | null;
  scanError: string | null;
  onScan: (files: File[]) => Promise<void>;
}

const ReceiptImagePicker = ({
  isScanning,
  scanStage,
  scanError,
  onScan,
}: ReceiptImagePickerProps) => {
  const cameraRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<SelectedReceiptImage[]>([]);
  const [selected, setSelected] = useState<SelectedReceiptImage[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  selectedRef.current = selected;

  useEffect(
    () => () => {
      selectedRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    },
    [],
  );

  const addFiles = (files: File[]) => {
    const result = selectReceiptFiles(
      files,
      selected.map((image) => image.file),
    );

    if (result.accepted.length > 0) {
      setSelected((current) => [
        ...current,
        ...result.accepted.map((file) => ({
          file,
          id: receiptFileKey(file),
          previewUrl: URL.createObjectURL(file),
        })),
      ]);
    }

    const reasons = [...new Set(result.rejected.map((entry) => entry.reason))];
    setSelectionError(reasons.length > 0 ? reasons.join(" ") : null);
  };

  const removeImage = (id: string) => {
    setSelected((current) => {
      const match = current.find((image) => image.id === id);
      if (match) URL.revokeObjectURL(match.previewUrl);
      return current.filter((image) => image.id !== id);
    });
    setSelectionError(null);
  };

  const clearImages = () => {
    selected.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setSelected([]);
    setSelectionError(null);
  };

  const handleInput = (files: FileList | null) => {
    if (files?.length) addFiles(Array.from(files));
  };

  const statusCopy =
    scanStage === "preparing"
      ? "Preparing your screenshots…"
      : "Reading store, date, items, and prices…";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-background to-accent/[0.08] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Images className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-foreground">
              Import from your camera roll
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Choose screenshots from Careem, InstaShop, noon, or another shopping
              app. For long orders, select the screenshots in order.
            </p>
          </div>
        </div>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept={RECEIPT_IMAGE_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={(event) => {
          handleInput(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={photosRef}
        type="file"
        accept={RECEIPT_IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          handleInput(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={isScanning || selected.length >= MAX_RECEIPT_FILES}
          className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Camera className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-foreground">Take a photo</span>
        </button>
        <button
          type="button"
          onClick={() => photosRef.current?.click()}
          disabled={isScanning || selected.length >= MAX_RECEIPT_FILES}
          className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/[0.06] px-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/[0.1] hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Images className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-foreground">Choose Photos</span>
        </button>
      </div>

      {selected.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {selected.length} image{selected.length !== 1 ? "s" : ""} ready
              </p>
              <p className="text-xs text-muted-foreground">
                Up to {MAX_RECEIPT_FILES} images from one order
              </p>
            </div>
            <button
              type="button"
              onClick={clearImages}
              disabled={isScanning}
              className="min-h-11 rounded-full px-3 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              Clear
            </button>
          </div>

          <div
            className={cn(
              "grid gap-2",
              selected.length === 1 ? "grid-cols-1" : "grid-cols-3",
            )}
          >
            {selected.map((image, index) => (
              <div
                key={image.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-border bg-secondary/40",
                  selected.length === 1 ? "h-44" : "aspect-[3/4]",
                )}
              >
                <img
                  src={image.previewUrl}
                  alt={`Receipt image ${index + 1}`}
                  className="h-full w-full object-contain"
                />
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-background/90 px-2 py-1 text-[10px] font-bold text-foreground shadow-sm backdrop-blur">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  disabled={isScanning}
                  aria-label={`Remove receipt image ${index + 1}`}
                  className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>

          {selected.length < MAX_RECEIPT_FILES && (
            <button
              type="button"
              onClick={() => photosRef.current?.click()}
              disabled={isScanning}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-primary/[0.05] hover:text-foreground disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add another screenshot
            </button>
          )}
        </div>
      )}

      {(selectionError || scanError) && (
        <p role="alert" className="text-xs leading-relaxed text-destructive">
          {selectionError || scanError}
        </p>
      )}

      {selected.length > 0 && (
        <Button
          type="button"
          onClick={() => onScan(selected.map((image) => image.file))}
          disabled={isScanning}
          className="min-h-12 w-full rounded-xl text-sm font-bold shadow-sm"
        >
          {isScanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              {statusCopy}
            </>
          ) : (
            <>
              <ScanLine className="mr-2 h-4 w-4" aria-hidden />
              Read {selected.length === 1 ? "receipt" : `${selected.length} images`}
            </>
          )}
        </Button>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
        Images are used to read this receipt and are not saved to your account.
      </p>
    </div>
  );
};

export default ReceiptImagePicker;
