import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEmbedding } from "@/lib/gemini-embedding";

export type SearchedNote = Record<string, any>;

/**
 * 키워드(정확히 일치) 검색 + 임베딩 기반 유사도 검색을 합쳐서 정비 기록을 찾습니다.
 * search/route.ts 와 diagnose/route.ts 에서 공통으로 사용합니다.
 */
export async function searchInternalNotes(
  query: string,
  opts?: { limit?: number; threshold?: number }
): Promise<SearchedNote[]> {
  const supabase = getSupabaseAdmin();
  const escaped = query.replace(/[%_]/g, (c: string) => `\\${c}`);
  const pattern = `%${escaped}%`;
  
  // 💡 기본 유사도 threshold를 0.65로 설정 (필요 시 외부에서 전달 가능)
  const matchThreshold = opts?.threshold ?? 0.65;

  // 1. 키워드 일치 검색
  const { data: keywordData, error: keywordError } = await supabase
    .from("repair_notes")
    .select("*")
    .or(
      [
        `search_text.ilike.${pattern}`,
        `vehicle_type.ilike.${pattern}`,
        `plate_number.ilike.${pattern}`,
        `order_id.ilike.${pattern}`,
        `symptom.ilike.${pattern}`,
        `inspection.ilike.${pattern}`,
        `cause.ilike.${pattern}`
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (keywordError) throw keywordError;

  const keywordResults: SearchedNote[] = (keywordData || []).map((note) => ({
    ...note,
    matchType: "keyword"
  }));
  const keywordIds = new Set(keywordResults.map((n) => n.id));

  // 2. 임베딩 벡터 유사도 검색
  let semanticResults: SearchedNote[] = [];
  const queryEmbedding = await getEmbedding(query, "RETRIEVAL_QUERY");

  if (queryEmbedding) {
    const { data: matches, error: matchError } = await supabase.rpc(
      "match_repair_notes",
      {
        query_embedding: queryEmbedding,
        match_count: 20,
        match_threshold: matchThreshold // 👈 상향 조정된 threshold 전달
      }
    );

    if (matchError) {
      console.error("match_repair_notes RPC error", matchError);
    } else if (matches && matches.length > 0) {
      const semanticIds = matches
        .map((m: { id: string }) => m.id)
        .filter((id: string) => !keywordIds.has(id));

      if (semanticIds.length > 0) {
        const { data: notesData, error: notesError } = await supabase
          .from("repair_notes")
          .select("*")
          .in("id", semanticIds);

        if (!notesError && notesData) {
          const similarityById = new Map(
            matches.map((m: { id: string; similarity: number }) => [m.id, m.similarity])
          );
          semanticResults = notesData
            .map((note) => ({
              ...note,
              matchType: "semantic",
              similarity: similarityById.get(note.id) ?? 0
            }))
            .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
        }
      }
    }
  }

  const all = [...keywordResults, ...semanticResults];
  return opts?.limit ? all.slice(0, opts.limit) : all;
}
