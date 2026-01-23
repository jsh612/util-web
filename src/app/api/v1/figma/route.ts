import { ComponentService } from "@/utils/figma-to-component";
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
    const preventFileCreation = formData.get("preventFileCreation") === "true";

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

    // 파일 생성 방지 모드인 경우
    if (preventFileCreation) {
      const promptText = await componentService.generateComponentContent({
        figmaUrl,
        description,
        defaultPrompt,
        files: validFiles,
        extractedText,
      });

      // 추후 컴포넌트 생성 로직이 구현되면 실제 컴포넌트 코드를 반환
      // 현재는 예시로 프롬프트 텍스트만 반환
      return NextResponse.json({
        success: true,
        message: "컴포넌트 프롬프트가 생성되었습니다.",
        componentData: [
          {
            fileName: "prompt.txt",
            content: promptText,
          },
          // 실제 구현 시에는 아래와 같이 여러 파일 추가 가능
          // {
          //   fileName: "Component.tsx",
          //   content: "// React component code here"
          // },
          // {
          //   fileName: "styles.css",
          //   content: "/* CSS styles here */"
          // }
        ],
      });
    }

    // 기존 파일 생성 로직
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
