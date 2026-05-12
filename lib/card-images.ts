import { supabase } from "@/lib/supabase";

export const CARD_IMAGES_BUCKET = "card-images";
export const MAX_CARD_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getImageExtension(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && ["gif", "jpeg", "jpg", "png", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/gif") {
    return "gif";
  }

  return "jpg";
}

export function validateCardImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Usa una foto JPG, PNG, WEBP o GIF.";
  }

  if (file.size > MAX_CARD_IMAGE_BYTES) {
    return "La foto debe pesar maximo 5 MB.";
  }

  return null;
}

export async function uploadCardImage(userId: string, file: File): Promise<string> {
  const validationError = validateCardImage(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const extension = getImageExtension(file);
  const imageId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const storagePath = `${userId}/${imageId}.${extension}`;
  const { error } = await supabase.storage
    .from(CARD_IMAGES_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(CARD_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}
