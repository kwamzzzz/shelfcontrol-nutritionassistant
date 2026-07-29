import { useEffect, useState } from "react";
import { resolveImageUrl } from "@/lib/storage-url";

/**
 * Resolves a stored image_url into a viewable URL. Private-bucket objects are
 * exchanged for a short-lived signed URL; external URLs pass straight through.
 */
export function useSignedImage(url: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!url) {
      setResolved(null);
      return;
    }
    resolveImageUrl(url).then((next) => {
      if (active) setResolved(next);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return resolved;
}
