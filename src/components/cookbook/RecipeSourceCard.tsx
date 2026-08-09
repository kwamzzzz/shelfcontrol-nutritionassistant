import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSignedImage } from "@/hooks/useSignedImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Link2, Pencil, StickyNote, X } from "lucide-react";

interface Props {
  recipeId: string;
  sourceUrl: string | null;
  sourceNotes: string | null;
  /** Stored recipe image (may be a private-bucket path) used as the link thumbnail. */
  imageUrl: string | null;
}

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const RecipeSourceCard = ({ recipeId, sourceUrl, sourceNotes, imageUrl }: Props) => {
  const qc = useQueryClient();
  const thumb = useSignedImage(imageUrl);
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(sourceUrl ?? "");
  const [notes, setNotes] = useState(sourceNotes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(sourceUrl ?? "");
    setNotes(sourceNotes ?? "");
  }, [sourceUrl, sourceNotes, recipeId]);

  const save = async () => {
    const cleaned = normalizeUrl(url);
    if (cleaned) {
      try {
        new URL(cleaned);
      } catch {
        toast.error("That doesn't look like a valid link");
        return;
      }
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("recipes")
        .update({ source_url: cleaned || null, source_notes: notes.trim() || null })
        .eq("id", recipeId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["recipes"] });
      setEditing(false);
      toast.success("Recipe source saved");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not save the source");
    } finally {
      setSaving(false);
    }
  };

  const host = sourceUrl ? hostOf(sourceUrl) : null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-medium text-foreground">
          <Link2 className="h-4 w-4 text-primary" /> Recipe source
        </h3>
        {!editing && (
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-full" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            {sourceUrl || sourceNotes ? "Edit" : "Add link"}
          </Button>
        )}
        {editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => {
              setEditing(false);
              setUrl(sourceUrl ?? "");
              setNotes(sourceNotes ?? "");
            }}
            aria-label="Cancel editing source"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/the-recipe"
            inputMode="url"
          />
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes — who shared it, tweaks you made, what to try next time…"
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" className="rounded-full" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save source"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="media-well h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={`Thumbnail for the source of this recipe from ${host}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <img
                      src={`https://www.google.com/s2/favicons?sz=64&domain=${host}`}
                      alt=""
                      loading="lazy"
                      className="h-6 w-6"
                    />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{host}</p>
                <p className="truncate text-xs text-muted-foreground">{sourceUrl}</p>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              No source yet — add the link to where you found this recipe.
            </p>
          )}

          {sourceNotes && (
            <div className="rounded-xl border border-border/50 bg-background/30 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <StickyNote className="h-3.5 w-3.5" /> Notes
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/90">{sourceNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeSourceCard;
