import { NextResponse } from "next/server";
import { parseWorkOrderImage } from "@/lib/gemini-parse";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const result = await parseWorkOrderImage(base64, mimeType);

    if (!result) {
      return NextResponse.json(
        { error: "작업지시서를 분석하지 못했습니다. GEMINI_API_KEY 설정을 확인해주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/parse-work-order", error);
    return NextResponse.json({ error: "작업지시서 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
