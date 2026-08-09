import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/upload-image";
import { useUpdateItem } from "@/hooks/usePantry";
import { cn } from "@/lib/utils";

interface Props {
  itemId: string;
  hasPhoto?: boolean;
  className?: string;
  folder?: string;
}

/** Inline "add/replace photo" control that writes straight to the item catalog. */
const ItemPhotoButton = ({ itemId, hasPhoto, className, folder = "items" }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const updateItem = useUpdateItem();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadImage(file, { folder });
      await updateItem.mutateAsync({ id: itemId, image_url: url });
      toast.success("Photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add the photo. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/70 bg-card/85 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card disabled:opacity-60",
          className,
        )}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5 text-primary" />}
        {busy ? "Uploading…" : hasPhoto ? "Replace photo" : "Add photo"}
      </button>
    </>
  );
};

export default ItemPhotoButton;
