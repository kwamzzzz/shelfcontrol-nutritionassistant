import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads an image to a private storage bucket and returns the canonical object
 * URL. The bucket policy requires the first path segment to be the uploader's
 * user id, so the path always leads with it.
 */
export async function uploadImage(
  file: File,
  opts: { bucket?: string; folder?: string } = {},
): Promise<string> {
  const bucket = opts.bucket ?? "item-images";
  const folder = opts.folder ?? "uploads";

  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image. Please choose a photo.");
  if (file.size > 5 * 1024 * 1024) throw new Error("That image is over 5MB. Please choose a smaller one.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again to add a photo.");

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
