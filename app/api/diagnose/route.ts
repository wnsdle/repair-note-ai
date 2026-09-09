import { NextResponse } from "next/server";
import { searchInternalNotes } from "@/lib/note-search";
import { getAiDiagnosis } from "@/lib/gemini-diagnose";

export const runtime = "nodejs";
export const maxDuration = 60; // 인터넷 검색 + AI 생성은 시간이 조금 더 걸릴 수 있습니다.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ error: "증상을 입력해주세요." }, { status: 400 });
    }

    // AI 판단에 참고시킬 내 경험은 상위 5건만 사용합니다 (프롬프트가 너무 길어지지 않도록).
    const relatedNotes = await searchInternalNotes(query, { limit: 5 });
    const context = relatedNotes.map((n) => ({
      vehicleType: n.vehicle_type,
      symptom: n.symptom,
      dtcCodes: n.dtc_codes || [],
      inspection: n.inspection,
      cause: n.cause
    }));

    const diagnosis = await getAiDiagnosis(query, context);

    if (!diagnosis) {
      return NextResponse.json(
        { error: "AI 진단을 가져오지 못했습니다. GEMINI_API_KEY 설정을 확인해주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json({ text: diagnosis.text });
  } catch (error) {
    console.error("POST /api/diagnose", error);
    return NextResponse.json({ error: "AI 진단 중 오류가 발생했습니다." }, { status: 500 });
  }
}
