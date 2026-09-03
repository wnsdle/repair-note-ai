import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { uploadToRepairFolder } from "@/lib/google-drive";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const noteId = String(formData.get("noteId") || "");
    const file = formData.get("file");

    if (!noteId || !(file instanceof File)) {
      return NextResponse.json(
        { error: "정비 기록과 사진을 함께 보내주세요." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "사진은 10MB 이하로 업로드해주세요." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
    const driveFile = await uploadToRepairFolder({
      fileName: `${new Date().toISOString().slice(0, 10)}_${noteId}_${safeName}`,
      mimeType: file.type,
      buffer
    });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("repair_note_photos")
      .insert({
        repair_note_id: noteId,
        drive_file_id: driveFile.id,
        file_name: driveFile.name,
        mime_type: driveFile.mimeType,
        web_view_link: driveFile.webViewLink,
        thumbnail_link: driveFile.thumbnailLink
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/photos/upload", error);
    return NextResponse.json(
      { error: "사진 업로드에 실패했습니다. Google Drive 설정을 확인해주세요." },
      { status: 500 }
    );
  }
}