import { NextResponse } from "next/server";
import { searchInternalNotes } from "@/lib/note-search";

export const runtime = "nodejs";

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

    const data = await searchInternalNotes(query);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("POST /api/search", error);
    return NextResponse.json(
      { error: "검색하지 못했습니다." },
      { status: 500 }
    );
  }
}
