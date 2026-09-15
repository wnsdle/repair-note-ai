import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEmbedding } from "@/lib/gemini-embedding";

export type SearchedNote = Record<string, any>;

/**
 * PostgREST .or()의 ilike 값은 SQL의 '%' wildcard를 그대로 넣는 것이 아니라
 * '*' wildcard를 사용합니다. 또한 검색어에 ',', '.', '(', ')' 등이 들어오면
 * logic-tree 문법으로 해석될 수 있으므로 quoted value로 감쌉니다.
 */
function buildIlikePattern(query: string): string {
  const escaped = query
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
  const safeQuery = escaped.replace(/\*/g, "\\*");
  return `"*${safeQuery}*"`;
}

/**
 * 키워드 검색 + 임베딩 기반 의미 검색을 합쳐서 정비 기록을 찾습니다.
 * search/route.ts 와 diagnose/route.ts 에서 공통으로 사용합니다.
 */
export async function searchInternalNotes(
  query: string,
  opts?: { limit?: number }
): Promise<SearchedNote[]> {
  const supabase = getSupabaseAdmin();
  const pattern = buildIlikePattern(query);

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
  const queryEmbedding = await getEmbedding(query, "RETRIEVAL_QUERY");

  if (queryEmbedding) {
    const { data: matches, error: matchError } = await supabase.rpc(
      "match_repair_notes",
      {
        query_embedding: queryEmbedding,
        match_count: 20
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
