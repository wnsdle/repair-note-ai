import { NextResponse } from "next/server";
import { parseTechToolScreens } from "@/lib/gemini-parse";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
    }

    const images = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        return { mimeType: file.type || "image/jpeg", data: Buffer.from(bytes).toString("base64") };
      })
    );

    const result = await parseTechToolScreens(images);

    if (!result) {
      return NextResponse.json(
        { error: "Tech Tool 화면을 분석하지 못했습니다. GEMINI_API_KEY 설정을 확인해주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/parse-tech-tool", error);
    return NextResponse.json({ error: "Tech Tool 화면 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
