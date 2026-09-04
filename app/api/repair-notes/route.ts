import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 경고등/진단코드 입력을 배열로 변환합니다.
 * 줄바꿈(\n) 또는 쉼표(,)로 구분해서 입력하면 여러 개로 나뉩니다.
 * 예: "P008700 연료 레일 압력 낮음, B00011B 스티어링 진단" 
 *   -> ["P008700 연료 레일 압력 낮음", "B00011B 스티어링 진단"]
 */
function parseDtcCodes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value
    .split(/[\n,]/)
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
      vehicle_model: clean(body.vehicleName) || clean(body.model),
      manufacturer: clean(body.manufacturer),
      model: clean(body.model),
      mileage_or_hours: clean(body.mileage),
      symptom,
      dtc_codes: dtcCodes,
      inspection: clean(body.inspection),
      cause: clean(body.rootCause),
      resolution: clean(body.repairAction),
      parts_used: clean(body.partsUsed),
      result: clean(body.result),
      is_resolved: Boolean(body.isResolved),
      tags: clean(body.tags),
      search_text: [
        clean(body.vehicleName),
        clean(body.manufacturer),
        clean(body.model),
        symptom,
        dtcCodes.join(" "),
        clean(body.inspection),
        clean(body.rootCause),
        clean(body.repairAction),
        clean(body.partsUsed),
        clean(body.result),
        clean(body.tags)
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
