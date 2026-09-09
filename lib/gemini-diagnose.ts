const GEMINI_CHAT_MODEL = "gemini-3.7-flash";

export type DiagnosisSource = { title: string; uri: string };
export type DiagnosisResult = { text: string; sources: DiagnosisSource[] };

export type ExperienceContext = {
  vehicleType: string;
  symptom: string;
  dtcCodes: string[];
  inspection: string;
  cause: string;
};

/**
 * 증상 설명 + 내 과거 정비 경험을 바탕으로,
 * Gemini의 인터넷 검색(google_search grounding)을 활용해 AI 진단(원인 후보 + 점검 순서)을 생성합니다.
 * API 키가 없거나 호출이 실패하면 null을 반환합니다.
 */
export async function getAiDiagnosis(
  symptomQuery: string,
  myExperience: ExperienceContext[]
): Promise<DiagnosisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const trimmed = symptomQuery.trim();
  if (!apiKey || !trimmed) return null;

  const experienceText = myExperience.length
    ? myExperience
        .map(
          (r, i) =>
            `${i + 1}) 차종: ${r.vehicleType || "미상"} / 증상: ${r.symptom} / 진단코드: ${
              r.dtcCodes.join(", ") || "없음"
            } / 점검내용: ${r.inspection || "없음"} / 원인: ${r.cause || "없음"}`
        )
        .join("\n")
    : "관련된 내 과거 정비 기록이 없습니다.";

  const prompt = `당신은 대형 화물차(볼보트럭 등) 정비를 전문으로 하는 숙련된 정비사를 돕는 진단 보조입니다.
아래 [현재 증상]과 정비사의 [내 과거 정비 경험]을 참고하고, 필요하면 인터넷 검색으로 관련 정비 매뉴얼/포럼/기술자료도 찾아서 종합한 뒤,
1) 가능성 높은 원인 후보를 우선순위 순으로
2) 정비소에서 바로 따라할 수 있는 구체적인 점검 순서를
한국어로 정리해서 답해주세요. 확실하지 않은 부분은 추측이라고 명시해주세요. 불필요한 인사말 없이 바로 본론으로 답하세요.

[현재 증상]
${trimmed}

[내 과거 정비 경험]
${experienceText}`;

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
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }]
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

    const chunks = candidate?.groundingMetadata?.groundingChunks || [];
    const sources: DiagnosisSource[] = chunks
      .map((c: any) => ({ title: c?.web?.title || c?.web?.uri || "출처", uri: c?.web?.uri }))
      .filter((s: DiagnosisSource) => Boolean(s.uri));

    return { text, sources };
  } catch (error) {
    console.error("Gemini diagnose request failed", error);
    return null;
  }
}
