import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface Props {
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
  bucket?: string;
  folder?: string;
  className?: string;
  size?: "sm" | "md";
}

const ImageUpload = ({
  currentUrl,
  onUploaded,
  onRemoved,
  bucket = "item-images",
  folder = "uploads",
  className,
  size = "md",
}: Props) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be under 5 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError(null);

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      setPreview(publicUrl);
      onUploaded(publicUrl);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onRemoved?.();
  };

  const sizeClasses = size === "sm" ? "h-20 w-20" : "h-32 w-full";

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {preview ? (
        <div className={cn("relative rounded-xl overflow-hidden group", sizeClasses)}>
          <img
            src={preview}
            alt="Upload preview"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Camera className="h-4 w-4 text-white" />
            </button>
            {onRemoved && (
              <button
                type="button"
                onClick={handleRemove}
                className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/80 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setError(null); inputRef.current?.click(); }}
          disabled={uploading}
          className={cn(
            "rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1.5 bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer",
            sizeClasses
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            <>
              <Camera className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Add Photo</span>
              <span className="text-[9px] text-muted-foreground/60">4:3 landscape · min 400×300</span>
            </>
          )}
        </button>
      )}

      {error && (
        <div className="mt-1.5 flex items-start gap-1.5 text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="text-xs leading-tight">{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
