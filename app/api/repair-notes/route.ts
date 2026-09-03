import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

    const note = {
      vehicle_name: clean(body.vehicleName),
      manufacturer: clean(body.manufacturer),
      model: clean(body.model),
      mileage_or_hours: clean(body.mileage),
      symptom,
      error_codes: clean(body.errorCodes),
      inspection: clean(body.inspection),
      root_cause: clean(body.rootCause),
      repair_action: clean(body.repairAction),
      parts_used: clean(body.partsUsed),
      result: clean(body.result),
      is_resolved: Boolean(body.isResolved),
      tags: clean(body.tags),
      search_text: [
        clean(body.vehicleName),
        clean(body.manufacturer),
        clean(body.model),
        symptom,
        clean(body.errorCodes),
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