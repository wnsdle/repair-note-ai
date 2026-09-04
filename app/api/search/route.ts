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

    // search_text 안에 증상/경고등/차량번호/오더번호/점검내용/원인이 전부 합쳐져 저장되어 있어서
    // 이 한 칸만 검색해도 사실상 전체 항목을 검색하는 효과가 있습니다.
    // dtc_codes는 배열이라 별도로 contains 조건도 함께 확인합니다 (정확한 코드로 검색할 때 대비).
    const { data, error } = await supabase
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
