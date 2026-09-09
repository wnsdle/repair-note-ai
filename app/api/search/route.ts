import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEmbedding } from "@/lib/gemini-embedding";

export const runtime = "nodejs";

type NoteRow = Record<string, any>;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json(
        { error: "검색어를 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    // %, _ 는 ilike 패턴에서 특수문자로 쓰이므로 이스케이프합니다.
    const escaped = query.replace(/[%_]/g, (c: string) => `\\${c}`);
    const pattern = `%${escaped}%`;

    // 1. 기존 키워드(정확히 일치) 검색 — 지금까지와 동일하게 동작합니다.
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

    const keywordResults: NoteRow[] = (keywordData || []).map((note) => ({
      ...note,
      matchType: "keyword"
    }));
    const keywordIds = new Set(keywordResults.map((n) => n.id));

    // 2. 💡 임베딩 기반 유사도 검색 — 단어가 정확히 같지 않아도
    //    의미가 비슷한 기록을 찾아서, 키워드 결과 아래에 추가로 붙여줍니다.
    let semanticResults: NoteRow[] = [];
    const queryEmbedding = await getEmbedding(query);

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

    const data = [...keywordResults, ...semanticResults];

    return NextResponse.json({ data });
  } catch (error) {
    console.error("POST /api/search", error);
    return NextResponse.json(
      { error: "검색하지 못했습니다." },
      { status: 500 }
    );
  }
}
