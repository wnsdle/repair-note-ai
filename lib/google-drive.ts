import { google } from "googleapis";
import { Readable } from "node:stream";

type DriveUpload = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

function getDriveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON 환경변수가 없습니다.");
  }

  const credentials = JSON.parse(raw);
  credentials.private_key = credentials.private_key?.replace(/\\n/g, "\n");

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"]
  });

  return google.drive({ version: "v3", auth });
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