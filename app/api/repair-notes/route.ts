import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEmbedding, buildEmbeddingSource } from "@/lib/gemini-embedding";

export const runtime = "nodejs";
const PHOTO_BUCKET = "repair-note-photos";
const PHOTO_URL_SECONDS = 60 * 60;

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function parseDtcCodes(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  return value.split("\n").map((v) => v.trim()).filter(Boolean);
}

async function buildNoteFields(body: any) {
  const symptom = clean(body.symptom);
  const dtcCodes = parseDtcCodes(body.errorCodes);
  const inspection = clean(body.inspection);
  const cause = clean(body.rootCause);
  const embedding = await getEmbedding(buildEmbeddingSource({ symptom, inspection, cause }));
  return {
    symptom,
    dtcCodes,
    note: {
      vehicle_type: clean(body.vehicleType), model_year: clean(body.modelYear), mileage_or_hours: clean(body.mileage),
      order_id: clean(body.orderId), plate_number: clean(body.plateNumber), symptom, dtc_codes: dtcCodes,
      inspection, cause, embedding,
      search_text: [clean(body.vehicleType), clean(body.plateNumber), clean(body.orderId), symptom, dtcCodes.join(" "), inspection, cause].filter(Boolean).join(" "),
    },
  };
}

async function addSignedPhotoUrls(supabase: ReturnType<typeof getSupabaseAdmin>, photos: any[]) {
  const result = [];
  for (const p of photos) {
    let thumbnailLink = p.thumbnail_link || "";
    let webViewLink = p.web_view_link || "";
    if (p.storage_path) {
      const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(p.storage_path, PHOTO_URL_SECONDS);
      if (data?.signedUrl) thumbnailLink = data.signedUrl;
      if (data?.signedUrl) webViewLink = data.signedUrl;
    }
    result.push({ id: p.id, thumbnailLink, webViewLink, fileName: p.file_name });
  }
  return result;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") || "20");
    const requestedOffset = Number(searchParams.get("offset") || "0");
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 20, 1), 50);
    const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);
    const supabase = getSupabaseAdmin();
    const { data: notesData, error } = await supabase.from("repair_notes")
      .select("id, vehicle_type, model_year, mileage_or_hours, order_id, plate_number, symptom, dtc_codes, inspection, cause, created_at, drive_folder_url")
      .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    const notes = notesData || [];
    const noteIds = notes.map((n) => n.id);
    const photosByNote: Record<string, { id: string; thumbnailLink: string; webViewLink: string; fileName: string }[]> = {};
    if (noteIds.length > 0) {
      const { data: photos, error: photoError } = await supabase.from("repair_note_photos")
        .select("id, repair_note_id, storage_path, thumbnail_link, web_view_link, file_name")
        .in("repair_note_id", noteIds);
      if (!photoError && photos) {
        for (const noteId of noteIds) {
          const notePhotos = photos.filter((p) => p.repair_note_id === noteId);
          if (notePhotos.length) photosByNote[noteId] = await addSignedPhotoUrls(supabase, notePhotos);
        }
      }
    }
    return NextResponse.json({ data: notes.map((n) => ({ ...n, photos: photosByNote[n.id] || [] })), pagination: { limit, offset, hasMore: notes.length === limit } });
  } catch (error) {
    console.error("GET /api/repair-notes", error);
    return NextResponse.json({ error: "정비 기록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json(); const { symptom, note } = await buildNoteFields(body);
    if (!symptom) return NextResponse.json({ error: "증상을 입력해주세요." }, { status: 400 });
    const supabase = getSupabaseAdmin(); const { data, error } = await supabase.from("repair_notes").insert(note).select().single();
    if (error) throw error; return NextResponse.json({ data }, { status: 201 });
  } catch (error) { console.error("POST /api/repair-notes", error); return NextResponse.json({ error: "정비 기록을 저장하지 못했습니다." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json(); const id = clean(body.id);
    if (!id) return NextResponse.json({ error: "수정할 기록의 id가 전달되지 않았습니다." }, { status: 400 });
    const { symptom, note } = await buildNoteFields(body);
    if (!symptom) return NextResponse.json({ error: "증상을 입력해주세요." }, { status: 400 });
    const supabase = getSupabaseAdmin(); const { data, error } = await supabase.from("repair_notes").update(note).eq("id", id).select().single();
    if (error) throw error; return NextResponse.json({ data });
  } catch (error) { console.error("PATCH /api/repair-notes", error); return NextResponse.json({ error: "정비 기록을 수정하지 못했습니다." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json(); const id = clean(body.id);
    if (!id) return NextResponse.json({ error: "삭제할 기록의 id가 전달되지 않았습니다." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data: photos, error: photosError } = await supabase.from("repair_note_photos").select("id, storage_path").eq("repair_note_id", id);
    if (photosError) throw photosError;
    const storagePaths = (photos || []).map((p) => p.storage_path).filter(Boolean) as string[];
    if (storagePaths.length) {
      const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove(storagePaths);
      if (storageError) throw storageError;
    }
    const { error: photoDeleteError } = await supabase.from("repair_note_photos").delete().eq("repair_note_id", id);
    if (photoDeleteError) throw photoDeleteError;
    const { error: noteDeleteError } = await supabase.from("repair_notes").delete().eq("id", id);
    if (noteDeleteError) throw noteDeleteError;
    return NextResponse.json({ success: true, message: "정비 기록과 연결된 사진을 삭제했습니다." });
  } catch (error: any) {
    console.error("DELETE /api/repair-notes", error);
    return NextResponse.json({ error: error?.message || "정비 기록을 삭제하지 못했습니다." }, { status: 500 });
  }
}
