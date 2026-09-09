const GEMINI_CHAT_MODEL = "gemini-3.6-flash";

export type DiagnosisResult = { text: string };

export type ExperienceContext = {
  vehicleType: string;
  symptom: string;
  dtcCodes: string[];
  inspection: string;
  cause: string;
};

function formatExperience(myExperience: ExperienceContext[]): string {
  if (myExperience.length === 0) {
    return "(일치하는 과거 정비 기록이 없습니다.)";
  }
  return myExperience
    .map(
      (r, i) =>
        `${i + 1}) 차종: ${r.vehicleType || "미상"} / 증상: ${r.symptom} / DTC: ${
          r.dtcCodes.join(", ") || "없음"
        } / 점검내용: ${r.inspection || "없음"} / 원인: ${r.cause || "없음"}`
    )
    .join("\n");
}

/**
 * 인터넷 검색(Grounding) 없이, Supabase에 저장된 과거 정비 기록(RAG)과
 * Gemini의 자체 지식만으로 진단을 생성합니다.
 * API 키가 없거나 호출이 실패하면 null을 반환합니다.
 */
export async function getAiDiagnosis(
  symptomQuery: string,
  myExperience: ExperienceContext[]
): Promise<DiagnosisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const trimmed = symptomQuery.trim();
  if (!apiKey || !trimmed) return null;

  const prompt = `[System]
당신은 베테랑 정비사의 데이터 기반 AI 정비 보조 시스템입니다.
제시된 [과거 정비 기록]과 당신의 [정비 메커니즘 지식]만을 조합하여 [현재 증상]을 진단하세요. (인터넷 검색 기능 사용 금지)

[제약 조건 - 엄격 준수]
1. 반드시 제공된 [과거 정비 기록] 중 현재 증상과 가장 유사한 사례를 우선적으로 참고하여 답변을 도출하세요.
2. [과거 정비 기록]에 없는 내용으로 진단할 경우, 그것이 AI의 일반 메커니즘 지식에 기반한 추론임을 명확히 밝히세요.
3. 근거가 부족하거나 데이터가 없으면 솔직히 "기록된 과거 사례 중 일치하는 원인이 없습니다"라고 답하고, 일반적인 점검 순서만 제안하세요. (소설 쓰기 절대 금지)

[과거 정비 기록 (Top ${myExperience.length || 0}개 유사 사례)]
${formatExperience(myExperience)}

[현재 증상]
${trimmed}

[출력 포맷]
1. 유사 과거 사례 분석 (과거에 해결했던 가장 비슷한 원인 및 사례)
2. 추천 진단 순서 (확률 높은 순서대로 1, 2, 3 단계 점검 항목)
3. 점검 시 주의사항 및 필요 측정값`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          // 💡 인터넷 검색(tools: google_search)은 완전히 제외합니다.
          //    무료 등급에서는 검색 기능이 사실상 막혀 있고, 정책상으로도 지금은 배제하기로 했습니다.
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      console.error("Gemini diagnose API error", await response.text());
      return null;
    }

    const json = await response.json();
    const candidate = json?.candidates?.[0];
    const text =
      candidate?.content?.parts
        ?.map((p: any) => p.text)
        .filter(Boolean)
        .join("\n") || "";

    if (!text) return null;

    return { text };
  } catch (error) {
    console.error("Gemini diagnose request failed", error);
    return null;
  }
}
