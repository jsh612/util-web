import { ComponentService } from "@/app/utils/figma-to-component";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "GET 요청 테스트 성공!" });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const figmaUrl = formData.get("figmaUrl");
    const filePath = formData.get("filePath");
    const fileName = formData.get("fileName");
    const description = formData.get("description");
    const files = formData.getAll("files");

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
      description: description?.toString(),
      files: validFiles,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating component:", error);
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
