import { google } from "googleapis";
import { Readable } from "node:stream";

type DriveUpload = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

/**
 * 서비스 계정은 개인 구글 계정의 저장공간(용량)을 쓸 수 없어서(storageQuotaExceeded 오류),
 * 대신 회원님의 개인 구글 계정 자체 권한(OAuth)으로 업로드합니다.
 * 정비소 관리 웹의 구글캘린더 연동과 같은 방식입니다.
 */
function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_DRIVE_REFRESH_TOKEN 환경변수가 필요합니다."
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function uploadToRepairFolder({
  fileName,
  mimeType,
  buffer
}: DriveUpload) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID 환경변수가 없습니다.");
  }

  const drive = getDriveClient();
  const result = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId]
    },
    media: {
      mimeType,
      body: Readable.from(buffer)
    },
    fields: "id,name,mimeType,webViewLink,thumbnailLink"
  });

  return result.data;
}
