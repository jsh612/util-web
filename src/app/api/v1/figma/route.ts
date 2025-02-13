import { ComponentService } from "@/app/utils/figma-to-component";
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

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename=${fileName}`,
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const figmaUrl = formData.get("figmaUrl") as string;
    const filePath = formData.get("filePath") as string;
    const fileName = formData.get("fileName") as string;
    const description = formData.get("description") as string;
    const defaultPrompt = formData.get("defaultPrompt") as string;
    const files = formData.getAll("files") as File[];
    const extractedText = formData.get("extractedText") as string;

    if (!figmaUrl || typeof figmaUrl !== "string") {
      return NextResponse.json(
        { error: "Figma URL이 필요합니다." },
        { status: 400 }
      );
    }

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        { error: "파일 경로가 필요합니다." },
        { status: 400 }
      );
    }

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { error: "파일 이름이 필요합니다." },
        { status: 400 }
      );
    }

    if (!defaultPrompt || typeof defaultPrompt !== "string") {
      return NextResponse.json(
        { error: "기본 프롬프트가 필요합니다." },
        { status: 400 }
      );
    }

    // 유효한 파일만 필터링
    const validFiles = files.filter(
      (file) => file instanceof File && file.size > 0
    ) as File[];

    if (validFiles.length > 5) {
      return NextResponse.json(
        { error: "첨부 파일은 최대 5개까지만 가능합니다." },
        { status: 400 }
      );
    }

    const componentService = new ComponentService();
    const result = await componentService.createComponent({
      figmaUrl,
      filePath,
      fileName,
      description,
      defaultPrompt,
      files: validFiles,
      extractedText,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
