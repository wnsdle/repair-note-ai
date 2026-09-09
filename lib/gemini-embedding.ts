// 1. 모델명을 text-embedding-004로 수정
const GEMINI_EMBEDDING_MODEL = "text-embedding-004";

// 2. Supabase DB 스키마 규격(768)에 맞춰 차원 수 768로 복구
const EMBEDDING_DIMENSIONS = 768;

/**
 * 벡터를 단위 길이(길이 1)로 정규화합니다.
 */
function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (!norm) return vector;
  return vector.map((v) => v / norm);
}

type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/**
 * 텍스트를 Gemini 임베딩 API로 벡터화합니다.
 * @param taskType "RETRIEVAL_DOCUMENT": 저장할 정비 기록용 (기본값)
 *                 "RETRIEVAL_QUERY": 검색창에 입력한 검색어용
 * API 키가 없거나 호출이 실패하면 null을 반환합니다.
 */
export async function getEmbedding(
  text: string,
  taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT"
): Promise<number[] | null> {
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
          taskType,
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
    if (!Array.isArray(values)) return null;

    return normalizeVector(values);
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
