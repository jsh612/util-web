import { NextRequest, NextResponse } from "next/server";
import * as pdfParse from "pdf-parse";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "PDF 파일이 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse.default(buffer);

    return NextResponse.json({ text: data.text });
  } catch (error) {
    return NextResponse.json(
      { error: "PDF 처리 중 오류가 발생했습니다.", errorMessage: error },
      { status: 500 }
    );
  }
}
