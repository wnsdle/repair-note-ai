import { NextResponse } from "next/server";
import { parseVoiceText } from "@/lib/gemini-parse";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text : "";

    if (!text.trim()) {
      return NextResponse.json({ error: "입력된 내용이 없습니다." }, { status: 400 });
    }

    const result = await parseVoiceText(text);

    if (!result) {
      return NextResponse.json(
        { error: "내용을 분석하지 못했습니다. GEMINI_API_KEY 설정을 확인해주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/voice-note", error);
    return NextResponse.json({ error: "음성 메모 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
