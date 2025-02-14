import * as fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath) {
    return NextResponse.json(
      { error: "파일 경로가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const fileContent = await fs.readFile(filePath);
    const fileName = filePath.split("/").pop() || "file";

    // MIME 타입 결정
    let contentType = "application/octet-stream";
    if (fileName.endsWith(".txt")) contentType = "text/plain";
    else if (fileName.endsWith(".png")) contentType = "image/png";
    else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg"))
      contentType = "image/jpeg";
    else if (fileName.endsWith(".pdf")) contentType = "application/pdf";

    // 한글 파일명 인코딩
    const encodedFileName = encodeURIComponent(fileName);

    return new Response(fileContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
      },
    });
  } catch (error) {
    console.error("File read error:", error);
    return NextResponse.json(
      { error: "파일을 읽을 수 없습니다." },
      { status: 404 }
    );
  }
}
