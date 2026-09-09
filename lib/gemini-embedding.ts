const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
// 💡 잘라 쓰지 않고 모델의 전체 차원(3072)을 그대로 사용해 정확도를 최대로 확보합니다.
const EMBEDDING_DIMENSIONS = 3072;

/**
 * 벡터를 단위 길이(길이 1)로 정규화합니다.
 * 3072차원(전체)은 API에서 이미 정규화되어 오지만, 혹시 모를 경우를 대비해 한 번 더 처리합니다.
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
 * 이 경우 호출부에서는 임베딩 없이(키워드 검색만 적용된 채로) 저장을 계속 진행합니다.
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
