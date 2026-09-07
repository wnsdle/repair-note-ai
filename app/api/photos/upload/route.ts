import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { uploadToRepairFolder } from "@/lib/google-drive";

export const runtime = "nodejs";

// 백엔드 API에서 RLS 권한 제약을 우회하기 위한 Supabase Admin 클라이언트 생성
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

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

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "사진은 4MB 이하로 업로드해주세요. (서버 처리 한도로 인한 제한)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
    const driveFile = await uploadToRepairFolder({
      fileName: `${new Date().toISOString().slice(0, 10)}_${noteId}_${safeName}`,
      mimeType: file.type,
      buffer,
    });

    const { data, error } = await supabaseAdmin
      .from("repair_note_photos")
      .insert({
        repair_note_id: noteId,
        drive_file_id: driveFile.id,
        file_name: driveFile.name,
        mime_type: driveFile.mimeType,
        web_view_link: driveFile.webViewLink,
        thumbnail_link: driveFile.thumbnailLink,
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