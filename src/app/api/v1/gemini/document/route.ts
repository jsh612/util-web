import { getGeminiChatManager } from "@/app/utils/gemini";
import { NextRequest, NextResponse } from "next/server";
import * as pdfParse from "pdf-parse";

const geminiChatManager = getGeminiChatManager();

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const username = formData.get("username") as string;
    const pdfFile = formData.get("file") as File;

    if (!username) {
      return NextResponse.json(
        { error: "사용자 이름이 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    if (!pdfFile) {
      return NextResponse.json(
        { error: "PDF 파일이 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    // 파일 유형 확인
    if (!pdfFile.type.includes("pdf")) {
      return NextResponse.json(
        { error: "PDF 파일만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    // PDF 파일 크기 제한 (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (pdfFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "PDF 파일 크기는 10MB를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    console.log(
      `PDF 파일 처리 시작: ${pdfFile.name}, 크기: ${pdfFile.size} 바이트`
    );

    // PDF 파일 처리
    const buffer = Buffer.from(await pdfFile.arrayBuffer());

    try {
      const data = await pdfParse.default(buffer);
      const extractedText = data.text;
      console.log(`PDF 텍스트 추출 완료, 길이: ${extractedText.length} 문자`);

      if (extractedText.length < 10) {
        return NextResponse.json(
          {
            error:
              "PDF에서 텍스트를 추출할 수 없거나 내용이 너무 적습니다. 다른 PDF 파일을 시도해주세요.",
            details: {
              extractedLength: extractedText.length,
              sampleText: extractedText.substring(0, 100),
            },
          },
          { status: 400 }
        );
      }

      // 텍스트가 너무 길면 잘라내기 (토큰 제한 고려)
      // Gemini 모델의 최대 입력 토큰은 30,720개이므로 약 100,000자 정도로 제한
      const MAX_TEXT_LENGTH = 100000;
      const trimmedText =
        extractedText.length > MAX_TEXT_LENGTH
          ? extractedText.slice(0, MAX_TEXT_LENGTH) +
            "\n\n[문서가 너무 길어서 잘렸습니다. 이후 내용은 포함되지 않습니다.]"
          : extractedText;

      // 사용자 문서 컨텍스트 설정
      const result = geminiChatManager.setDocumentContext(
        username,
        trimmedText
      );

      if (!result.success) {
        return NextResponse.json(
          { error: "문서 컨텍스트 설정 중 오류가 발생했습니다." },
          { status: 500 }
        );
      }

      // 설정 후 문서 상태 다시 확인
      const contextCheck = geminiChatManager.getDocumentContext(username);
      const isInitialized = contextCheck.success && contextCheck.hasDocument;

      return NextResponse.json({
        success: true,
        message: "PDF 파일이 성공적으로 처리되었습니다.",
        textLength: trimmedText.length,
        isInitialized: isInitialized,
        documentKey: result.documentKey,
        documentPreview: result.documentPreview,
        // 클라이언트에서 저장할 수 있도록 전체 문서 텍스트 반환
        documentText: trimmedText,
        metadata: {
          pdfName: pdfFile.name,
          originalSize: pdfFile.size,
          extractedTextLength: extractedText.length,
          truncated: extractedText.length > MAX_TEXT_LENGTH,
          previewText: trimmedText.substring(0, 200) + "...", // 미리보기 텍스트
        },
      });
    } catch (pdfError) {
      console.error("PDF 파싱 오류:", pdfError);
      return NextResponse.json(
        {
          error: "PDF 파일 파싱 중 오류가 발생했습니다.",
          details: String(pdfError),
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("PDF 업로드 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다.", details: String(error) },
      { status: 500 }
    );
  }
}

// 현재 설정된 문서 컨텍스트 정보 가져오기
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "사용자 이름이 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    const result = geminiChatManager.getDocumentContext(username);

    // 사용자 정보가 없는 경우에도 오류 대신 빈 상태 반환
    if (!result.success) {
      return NextResponse.json({
        success: true,
        hasDocument: false,
        textLength: 0,
        isInitialized: false,
        message: "신규 사용자입니다.",
      });
    }

    // 문서 컨텍스트가 있는지 확인
    const hasDocument = !!result.data && result.data.length > 10;
    const documentPreview = result.data
      ? result.data.substring(0, 100) + "..."
      : "";

    return NextResponse.json({
      success: true,
      hasDocument: hasDocument,
      textLength: result.data ? result.data.length : 0,
      isInitialized: hasDocument,
      preview: documentPreview,
    });
  } catch (error) {
    console.error("문서 컨텍스트 조회 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
