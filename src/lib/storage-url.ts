import { supabase } from "@/integrations/supabase/client";

const BUCKET = "item-images";

/**
 * The item-images bucket is private. Stored image_url values may still be
 * legacy public URLs, so extract the object path from whichever form we get.
 */
export function itemImagePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const marker = `/${BUCKET}/`;
  const idx = trimmed.indexOf(marker);
  if (idx === -1) return null;
  const path = trimmed.slice(idx + marker.length).split("?")[0];
  return path || null;
}

const cache = new Map<string, { url: string; expiresAt: number }>();
const TTL_SECONDS = 60 * 60;

export async function resolveImageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const path = itemImagePath(url);
  if (!path) return url; // external/CDN image, use as-is

  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
  if (error || !data?.signedUrl) return null;

  cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + (TTL_SECONDS - 300) * 1000 });
  return data.signedUrl;
}
