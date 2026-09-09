import { NextResponse } from "next/server";
import { searchInternalNotes } from "@/lib/note-search";
import { getAiDiagnosis } from "@/lib/gemini-diagnose";

export const runtime = "nodejs";
// 💡 인터넷 검색 없이 백엔드 DB 연동 + AI 생성만 수행하므로 응답 속도가 매우 빠릅니다.
export const maxDuration = 15; 

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ error: "증상을 입력해주세요." }, { status: 400 });
    }

    // 💡 유사도 threshold를 0.65로 지정하여 관련 없는 노트("오옹" 등)가 걸러지도록 설정합니다.
    // (만약 searchInternalNotes 함수에서 threshold 옵션을 받는다면 아래와 같이 전달합니다)
    const relatedNotes = await searchInternalNotes(query, { limit: 5, threshold: 0.65 });

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
