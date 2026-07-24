import { useState } from "react";
import { Check, Share2 } from "lucide-react";

interface StoryShareProps {
  text: string;
}

/**
 * Hands the summary to the OS share sheet, where the user picks the destination
 * and confirms. Falls back to the clipboard when the browser has no share API.
 */
export function StoryShare({ text }: StoryShareProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Dismissed the sheet, or the browser refused — fall through to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Copied to clipboard" : "Share your story"}
    </button>
  );
}
