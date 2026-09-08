import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return new NextResponse("File ID is required", { status: 400 });
  }

  try {
    // 구글 드라이브 다이렉트 썸네일 URL 요청
    const driveUrl = `https://lh3.googleusercontent.com/d/${fileId}=w400`;
    const response = await fetch(driveUrl);

    if (!response.ok) {
      // 2차 예비 URL
      const fallbackUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) {
        return new NextResponse("Failed to fetch image", { status: fallbackRes.status });
      }
      const buffer = await fallbackRes.arrayBuffer();
      const contentType = fallbackRes.headers.get("content-type") || "image/jpeg";
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, s-maxage=86400"
        }
      });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400"
      }
    });
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
