import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEmbedding } from "@/lib/gemini-embedding";

export type SearchedNote = Record<string, any>;

/**
 * 키워드(정확히 일치) 검색 + 임베딩 기반 유사도 검색을 합쳐서 정비 기록을 찾습니다.
 * search/route.ts 와 diagnose/route.ts 에서 공통으로 사용합니다.
 */
export async function searchInternalNotes(
  query: string,
  opts?: { limit?: number }
): Promise<SearchedNote[]> {
  const supabase = getSupabaseAdmin();
  const escaped = query.replace(/[%_]/g, (c: string) => `\\${c}`);
  const pattern = `%${escaped}%`;

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

  let semanticResults: SearchedNote[] = [];
  // 검색어이므로 RETRIEVAL_QUERY 방식으로 임베딩합니다.
  const queryEmbedding = await getEmbedding(query, "RETRIEVAL_QUERY");

  if (queryEmbedding) {
    const { data: matches, error: matchError } = await supabase.rpc(
      "match_repair_notes",
      {
        query_embedding: queryEmbedding,
        match_count: 20,
        match_threshold: 0.6
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
