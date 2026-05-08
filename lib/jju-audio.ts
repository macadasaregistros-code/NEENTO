import { supabase } from "@/lib/supabase";

export const JJU_AUDIO_BUCKET = "card-audios";

export interface JjuCardAudioRecord {
  cardId: string;
  createdAt: string;
  mimeType: string;
  storagePath: string;
  updatedAt: string;
}

interface JjuCardAudioRow {
  card_id: string;
  created_at: string;
  mime_type: string;
  storage_path: string;
  updated_at: string;
}

function mapJjuAudioRow(row: JjuCardAudioRow): JjuCardAudioRecord {
  return {
    cardId: row.card_id,
    createdAt: row.created_at,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    updatedAt: row.updated_at,
  };
}

function getAudioExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return "m4a";
  }

  if (mimeType.includes("mpeg")) {
    return "mp3";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  if (mimeType.includes("wav")) {
    return "wav";
  }

  return "webm";
}

export async function fetchJjuAudioRecords(): Promise<JjuCardAudioRecord[]> {
  const { data, error } = await supabase
    .from("jju_card_audio")
    .select("card_id, storage_path, mime_type, created_at, updated_at");

  if (error || !data) {
    return [];
  }

  return (data as JjuCardAudioRow[]).map(mapJjuAudioRow);
}

export async function getJjuAudioSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(JJU_AUDIO_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function uploadJjuCardAudio(
  cardId: string,
  blob: Blob,
): Promise<JjuCardAudioRecord> {
  const mimeType = (blob.type || "audio/webm").split(";")[0] ?? "audio/webm";
  const extension = getAudioExtension(mimeType);
  const storagePath = `jju/${cardId}/${Date.now()}.${extension}`;
  const { data: existingRow } = await supabase
    .from("jju_card_audio")
    .select("storage_path")
    .eq("card_id", cardId)
    .maybeSingle();

  const { error: uploadError } = await supabase.storage
    .from(JJU_AUDIO_BUCKET)
    .upload(storagePath, blob, {
      cacheControl: "31536000",
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error } = await supabase
    .from("jju_card_audio")
    .upsert(
      {
        card_id: cardId,
        mime_type: mimeType,
        storage_path: storagePath,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "card_id",
      },
    )
    .select("card_id, storage_path, mime_type, created_at, updated_at")
    .single();

  if (error) {
    await supabase.storage.from(JJU_AUDIO_BUCKET).remove([storagePath]);
    throw error;
  }

  const oldPath = (existingRow as { storage_path?: string } | null)?.storage_path;

  if (oldPath && oldPath !== storagePath) {
    await supabase.storage.from(JJU_AUDIO_BUCKET).remove([oldPath]);
  }

  return mapJjuAudioRow(data as JjuCardAudioRow);
}
