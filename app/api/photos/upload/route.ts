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

    // Vercel 서버리스 함수는 요청 본문 크기에 자체 한도(약 4.5MB)가 있어서,
    // 그보다 여유 있게 4MB로 제한합니다. 더 큰 사진을 지원하려면
    // 브라우저에서 구글드라이브로 직접 업로드하는 방식으로 바꿔야 합니다.
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
