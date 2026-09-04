import { NextResponse } from "next/server";
import { getManagementSupabase } from "@/lib/supabase-management";

export const runtime = "nodejs";

/**
 * 정비소 관리 웹의 오더번호로 접수 정보를 조회합니다 (읽기 전용).
 * 예: GET /api/order-lookup?orderId=ORD-20260902-001
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = (searchParams.get("orderId") || "").trim();

    if (!orderId) {
      return NextResponse.json({ error: "오더번호를 입력해주세요." }, { status: 400 });
    }

    const supabase = getManagementSupabase();
    const { data, error } = await supabase
      .from("records")
      .select("id, vehicle_number, car_model, mileage, date")
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: "해당 오더번호를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        orderId: data.id,
        plateNumber: data.vehicle_number,
        vehicleType: data.car_model,
        mileage: data.mileage,
        repairDate: data.date,
      },
    });
  } catch (error) {
    console.error("GET /api/order-lookup", error);
    return NextResponse.json({ error: "오더 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
