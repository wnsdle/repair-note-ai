const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (!norm) return vector;
  return vector.map((v) => v / norm);
}

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
          taskType: "SEMANTIC_SIMILARITY",
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

export function buildEmbeddingSource(fields: {
  symptom: string;
  inspection: string;
  cause: string;
}) {
  return [fields.symptom, fields.inspection, fields.cause].filter(Boolean).join("\n");
}