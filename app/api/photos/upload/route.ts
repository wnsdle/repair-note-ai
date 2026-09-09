import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { Readable } from "stream";

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!clientEmail || !privateKey) {
      return NextResponse.json(
        { error: "구글 환경변수(GOOGLE_CLIENT_EMAIL 또는 GOOGLE_PRIVATE_KEY)가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // JWT 인증 객체 생성
    const auth = new google.auth.JWT(
      clientEmail,
      undefined,
      privateKey,
      ["https://www.googleapis.com/auth/drive"]
    );

    const drive = google.drive({ version: "v3", auth });

    const formData = await request.formData();
    const noteId = formData.get("noteId") as string;
    const file = formData.get("file") as File;

    if (!noteId || !file) {
      return NextResponse.json(
        { error: "필수 데이터(noteId 또는 file)가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 1. 해당 정비 기록 조회
    const { data: note, error: noteError } = await supabase
      .from("repair_notes")
      .select("id, plate_number, order_id, drive_folder_id, drive_folder_url")
      .eq("id", noteId)
      .single();

    if (noteError || !note) {
      return NextResponse.json(
        { error: "정비 기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    let folderId = note.drive_folder_id;
    let folderUrl = note.drive_folder_url;

    // 2. 드라이브 폴더가 없으면 첫 번째 업로드 시점에 자동 생성
    if (!folderId) {
      const folderName = `[정비기록] ${note.plate_number || "차량"} (${note.order_id || noteId.slice(0, 8)})`;

      const folderResponse = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
            ? [process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID]
            : undefined,
        },
        fields: "id, webViewLink",
      });

      folderId = folderResponse.data.id!;
      folderUrl = folderResponse.data.webViewLink!;

      // 폴더 접근 권한 변경 (링크가 있는 사용자 열람)
      await drive.permissions.create({
        fileId: folderId,
        requestBody: { role: "reader", type: "anyone" },
      });

      // repair_notes 테이블에 폴더 ID/URL 저장
      await supabase
        .from("repair_notes")
        .update({
          drive_folder_id: folderId,
          drive_folder_url: folderUrl,
        })
        .eq("id", noteId);
    }

    // 3. 폴더 내부로 사진 파일 업로드
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const uploadedFile = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: "id, webViewLink, thumbnailLink",
    });

    // 4. 개별 사진 정보를 repair_note_photos 테이블에도 기록
    await supabase.from("repair_note_photos").insert({
      repair_note_id: noteId,
      drive_file_id: uploadedFile.data.id,
      file_name: file.name,
      mime_type: file.type,
      web_view_link: uploadedFile.data.webViewLink,
      thumbnail_link: uploadedFile.data.thumbnailLink,
    });

    return NextResponse.json({
      success: true,
      folderUrl,
      fileId: uploadedFile.data.id,
    });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { error: error.message || "업로드 중 오류 발생" },
      { status: 500 }
    );
  }
}
