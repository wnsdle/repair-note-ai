import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 경고등/진단코드 입력을 배열로 변환합니다.
 * 줄바꿈(엔터)으로 구분해서 여러 줄 입력하면 각 줄이 하나의 항목이 됩니다.
 */
function parseDtcCodes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("repair_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/repair-notes", error);
    return NextResponse.json(
      { error: "정비 기록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const symptom = clean(body.symptom);
    if (!symptom) {
      return NextResponse.json(
        { error: "증상을 입력해주세요." },
        { status: 400 }
      );
    }

    const dtcCodes = parseDtcCodes(body.errorCodes);

    const note = {
      vehicle_type: clean(body.vehicleType),
      model_year: clean(body.modelYear),
      mileage_or_hours: clean(body.mileage),
      order_id: clean(body.orderId),
      plate_number: clean(body.plateNumber),
      symptom,
      dtc_codes: dtcCodes,
      inspection: clean(body.inspection),
      cause: clean(body.rootCause),
      // 검색용 태그는 사용자가 입력하지 않아도, 아래 값들을 자동으로 모아서 생성합니다.
      search_text: [
        clean(body.vehicleType),
        clean(body.plateNumber),
        clean(body.orderId),
        symptom,
        dtcCodes.join(" "),
        clean(body.inspection),
        clean(body.rootCause)
      ]
        .filter(Boolean)
        .join(" ")
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("repair_notes")
      .insert(note)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/repair-notes", error);
    return NextResponse.json(
      { error: "정비 기록을 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
