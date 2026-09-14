import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
const BUCKET = "repair-note-photos";

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "photo";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const formData = await request.formData();
    const noteId = String(formData.get("noteId") || "").trim();
    const file = formData.get("file");

    if (!noteId || !(file instanceof File)) return NextResponse.json({ error: "필수 데이터(noteId 또는 file)가 누락되었습니다." }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "사진은 10MB 이하만 업로드할 수 있습니다." }, { status: 400 });

    const { data: note, error: noteError } = await supabase.from("repair_notes").select("id").eq("id", noteId).single();
    if (noteError || !note) return NextResponse.json({ error: "정비 기록을 찾을 수 없습니다." }, { status: 404 });

    const path = `${noteId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (uploadError) throw uploadError;

    const { data: photo, error: photoError } = await supabase.from("repair_note_photos").insert({ repair_note_id: noteId, storage_path: path, file_name: file.name, mime_type: file.type }).select("id").single();
    if (photoError) { await supabase.storage.from(BUCKET).remove([path]); throw photoError; }

    return NextResponse.json({ success: true, path, fileId: photo.id });
  } catch (error: any) {
    console.error("Supabase Storage upload error:", error);
    return NextResponse.json({ error: error?.message || "사진 업로드 중 오류가 발생했습니다." }, { status: 500 });
  }
}
