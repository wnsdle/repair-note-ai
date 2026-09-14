import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
const BUCKET = "repair-note-photos";
const SIGNED_URL_SECONDS = 60 * 60;

export async function GET(request: NextRequest) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path) return new NextResponse("Storage path is required", { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) return new NextResponse("Failed to create image URL", { status: 404 });
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.error("Photo proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
