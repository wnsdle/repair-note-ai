const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

/**
 * 텍스트를 Gemini 임베딩 API로 벡터화합니다.
 * API 키가 없거나 호출이 실패하면 null을 반환합니다.
 * 이 경우 호출부에서는 임베딩 없이(키워드 검색만 적용된 채로) 저장을 계속 진행합니다.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const trimmed = text.trim();

  if (!apiKey) {
    console.error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
    return null;
  }
  if (!trimmed) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          content: { parts: [{ text: trimmed }] },
          outputDimensionality: EMBEDDING_DIMENSIONS
        })
      }
    );

    if (!response.ok) {
      console.error("Gemini embedding API error", await response.text());
      return null;
    }

    const json = await response.json();
    const values = json?.embedding?.values;
    return Array.isArray(values) ? values : null;
  } catch (error) {
    console.error("Gemini embedding request failed", error);
    return null;
  }
}

/** 정비 기록에서 임베딩할 텍스트를 하나로 합칩니다 (증상+점검내용+원인). */
export function buildEmbeddingSource(fields: {
  symptom: string;
  inspection: string;
  cause: string;
}) {
  return [fields.symptom, fields.inspection, fields.cause].filter(Boolean).join("\n");
}