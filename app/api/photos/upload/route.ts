// ... existing code ...
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { uploadToRepairFolder } from "@/lib/google-drive";

export const runtime = "nodejs";

// 백엔드 API에서 RLS 권한 제약을 우회하기 위한 Supabase Admin 클라이언트 생성
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // SUPABASE_SERVICE_ROLE_KEY가 등록되어 있으면 RLS를 완벽히 우회합니다.
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export async function POST(request: Request) {
// ... existing code ...
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
    const driveFile = await uploadToRepairFolder({
      fileName: `${new Date().toISOString().slice(0, 10)}_${noteId}_${safeName}`,
      mimeType: file.type,
      buffer
    });

    const { data, error } = await supabaseAdmin
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
// ... existing code ...