import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query =
      typeof body.query === "string" ? body.query.trim().replace(/[%_]/g, "") : "";

    if (!query) {
      return NextResponse.json(
        { error: "검색어를 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const pattern = `%${query}%`;
    const { data, error } = await supabase
      .from("repair_notes")
      .select("*")
      .or(
        [
          `vehicle_name.ilike.${pattern}`,
          `manufacturer.ilike.${pattern}`,
          `model.ilike.${pattern}`,
          `symptom.ilike.${pattern}`,
          `error_codes.ilike.${pattern}`,
          `inspection.ilike.${pattern}`,
          `root_cause.ilike.${pattern}`,
          `repair_action.ilike.${pattern}`,
          `parts_used.ilike.${pattern}`,
          `result.ilike.${pattern}`,
          `tags.ilike.${pattern}`
        ].join(",")
      )
      .order("is_resolved", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ data, query });
  } catch (error) {
    console.error("POST /api/search", error);
    return NextResponse.json(
      { error: "검색하지 못했습니다. Supabase 설정을 확인해주세요." },
      { status: 500 }
    );
  }
}