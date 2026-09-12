import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEmbedding, buildEmbeddingSource } from "@/lib/gemini-embedding";

export const runtime = "nodejs";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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
      vehicle_type: clean(body.vehicleType),
      model_year: clean(body.modelYear),
      mileage_or_hours: clean(body.mileage),
      order_id: clean(body.orderId),
      plate_number: clean(body.plateNumber),
      symptom,
      dtc_codes: dtcCodes,
      inspection,
      cause,
      embedding,
      search_text: [clean(body.vehicleType), clean(body.plateNumber), clean(body.orderId), symptom, dtcCodes.join(" "), inspection, cause].filter(Boolean).join(" "),
    },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") || "20");
    const requestedOffset = Number(searchParams.get("offset") || "0");
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 20, 1), 50);
    const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);

    const supabase = getSupabaseAdmin();
    // 기록보기에서 실제로 사용하는 필드만 조회하여 응답 크기와 DB 직렬화를 줄입니다.
    const { data: notesData, error } = await supabase
      .from("repair_notes")
      .select("id, vehicle_type, model_year, mileage_or_hours, order_id, plate_number, symptom, dtc_codes, inspection, cause, created_at, drive_folder_url")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const notes = notesData || [];
    const noteIds = notes.map((n) => n.id);
    const photosByNote: Record<string, { id: string; thumbnailLink: string; webViewLink: string; fileName: string }[]> = {};

    if (noteIds.length > 0) {
      const { data: photos, error: photoError } = await supabase
        .from("repair_note_photos")
        .select("id, repair_note_id, thumbnail_link, web_view_link, file_name")
        .in("repair_note_id", noteIds);
      if (!photoError && photos) {
        for (const p of photos) {
          const key = p.repair_note_id as string;
          if (!photosByNote[key]) photosByNote[key] = [];
          photosByNote[key].push({ id: p.id, thumbnailLink: p.thumbnail_link, webViewLink: p.web_view_link, fileName: p.file_name });
        }
      }
    }

    return NextResponse.json({
      data: notes.map((n) => ({ ...n, photos: photosByNote[n.id] || [] })),
      pagination: { limit, offset, hasMore: notes.length === limit },
    });
  } catch (error) {
    console.error("GET /api/repair-notes", error);
    return NextResponse.json({ error: "정비 기록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symptom, note } = await buildNoteFields(body);
    if (!symptom) return NextResponse.json({ error: "증상을 입력해주세요." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("repair_notes").insert(note).select().single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/repair-notes", error);
    return NextResponse.json({ error: "정비 기록을 저장하지 못했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = clean(body.id);
    if (!id) return NextResponse.json({ error: "수정할 기록의 id가 전달되지 않았습니다." }, { status: 400 });
    const { symptom, note } = await buildNoteFields(body);
    if (!symptom) return NextResponse.json({ error: "증상을 입력해주세요." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("repair_notes").update(note).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error("PATCH /api/repair-notes", error);
    return NextResponse.json({ error: "정비 기록을 수정하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = clean(body.id);
    if (!id) return NextResponse.json({ error: "삭제할 기록의 id가 전달되지 않았습니다." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data: note, error: noteError } = await supabase.from("repair_notes").select("id, drive_folder_id").eq("id", id).single();
    if (noteError || !note) return NextResponse.json({ error: "삭제할 정비 기록을 찾을 수 없습니다." }, { status: 404 });
    const { data: photos, error: photosError } = await supabase.from("repair_note_photos").select("id, drive_file_id").eq("repair_note_id", id);
    if (photosError) throw photosError;
    const driveFileIds = (photos || []).map((photo) => photo.drive_file_id).filter((fileId): fileId is string => Boolean(fileId));
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    if (driveFileIds.length > 0 || note.drive_folder_id) {
      if (!clientId || !clientSecret || !refreshToken) return NextResponse.json({ error: "Google Drive 삭제에 필요한 OAuth 환경변수가 설정되지 않았습니다." }, { status: 500 });
      // Google Drive SDK는 삭제 요청 때만 로드하여 기록보기 GET의 cold start 부담을 줄입니다.
      const { google } = await import("googleapis");
      const auth = new google.auth.OAuth2(clientId, clientSecret);
      auth.setCredentials({ refresh_token: refreshToken });
      const drive = google.drive({ version: "v3", auth });
      for (const fileId of driveFileIds) {
        try { await drive.files.delete({ fileId }); } catch (error: any) { if (error?.code !== 404) throw error; }
      }
      if (note.drive_folder_id) {
        try { await drive.files.delete({ fileId: note.drive_folder_id }); } catch (error: any) { if (error?.code !== 404) throw error; }
      }
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
