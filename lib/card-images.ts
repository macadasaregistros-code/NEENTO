import { supabase } from "@/lib/supabase";

export const CARD_IMAGES_BUCKET = "card-images";
export const MAX_CARD_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const FALLBACK_MAX_IMAGE_SIZE = 900;
const FALLBACK_IMAGE_QUALITY = 0.78;

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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("No se pudo leer la foto."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("No se pudo preparar la foto."));
    };
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onerror = () => reject(new Error("No se pudo cargar la foto."));
    image.onload = () => resolve(image);
    image.src = url;
  });
}

async function createCompressedImageDataUrl(file: File): Promise<string> {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);
    const scale = Math.min(
      1,
      FALLBACK_MAX_IMAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return readFileAsDataUrl(file);
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", FALLBACK_IMAGE_QUALITY);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
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
    return createCompressedImageDataUrl(file);
  }

  const { data } = supabase.storage
    .from(CARD_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}
