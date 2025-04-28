"use server";

import { getGeminiChatManager } from "@/app/utils/gemini";
import {
  ContentListUnion,
  GenerateContentResponseUsageMetadata,
} from "@google/genai";
import * as pdfParse from "pdf-parse";

// 타입 정의
export interface ChatResponseData {
  success: boolean;
  data?: {
    text: string | undefined;
    usageMetadata: GenerateContentResponseUsageMetadata | undefined;
  };
  error?: string;
}

export interface InitResponseData {
  success: boolean;
  error?: string;
  chatId?: string;
}

export interface DocumentContextResponse {
  success: boolean;
  hasDocument?: boolean;
  textLength?: number;
  documentKey?: string;
  documentPreview?: string;
  isInitialized?: boolean;
  error?: string;
}

export interface ProcessPdfResponse {
  success: boolean;
  message?: string;
  textLength?: number;
  isInitialized?: boolean;
  documentKey?: string;
  documentPreview?: string;
  documentText?: string;
  metadata?: {
    pdfName: string;
    originalSize: number;
    extractedTextLength: number;
    truncated: boolean;
    previewText: string;
  };
  error?: string;
  details?: string;
}

// 허용된 사용자 목록
const validUsers = process.env.TEMP_PASSIBLE_USER?.split(",") || [];

const geminiManager = getGeminiChatManager();

/**
 * PDF 파일 처리 함수
 */
export async function processPdfDocument(
  formData: FormData
): Promise<ProcessPdfResponse> {
  try {
    const username = formData.get("username") as string;
    const pdfFile = formData.get("file") as File;

    if (!username) {
      return {
        success: false,
        error: "사용자 이름이 제공되지 않았습니다.",
      };
    }

    if (!pdfFile) {
      return {
        success: false,
        error: "PDF 파일이 제공되지 않았습니다.",
      };
    }

    // 파일 유형 확인
    if (!pdfFile.type.includes("pdf")) {
      return {
        success: false,
        error: "PDF 파일만 업로드 가능합니다.",
      };
    }

    // PDF 파일 크기 제한 (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (pdfFile.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "PDF 파일 크기는 10MB를 초과할 수 없습니다.",
      };
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
        return {
          success: false,
          error:
            "PDF에서 텍스트를 추출할 수 없거나 내용이 너무 적습니다. 다른 PDF 파일을 시도해주세요.",
          details: `추출된 텍스트 길이: ${extractedText.length}`,
        };
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
      const result = geminiManager.setDocumentContext(username, trimmedText);

      if (!result.success) {
        return {
          success: false,
          error: "문서 컨텍스트 설정 중 오류가 발생했습니다.",
        };
      }

      // 설정 후 문서 상태 다시 확인
      const contextCheck = geminiManager.getDocumentContext(username);
      const isInitialized = contextCheck.success && contextCheck.hasDocument;

      return {
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
      };
    } catch (pdfError) {
      console.error("PDF 파싱 오류:", pdfError);
      return {
        success: false,
        error: "PDF 파일 파싱 중 오류가 발생했습니다.",
        details: String(pdfError),
      };
    }
  } catch (error) {
    console.error("PDF 처리 오류:", error);
    return {
      success: false,
      error: "PDF 처리 중 오류가 발생했습니다.",
      details: String(error),
    };
  }
}

/**
 * Gemini 채팅 초기화 함수
 */
export async function initializeGeminiChat(
  username: string,
  documentText?: string
): Promise<InitResponseData> {
  if (!username) {
    return {
      success: false,
      error: "사용자 이름이 제공되지 않았습니다.",
    };
  }

  if (validUsers.length > 0 && !validUsers.includes(username)) {
    return {
      success: false,
      error: "유효하지 않은 사용자 이름입니다.",
    };
  }

  return await geminiManager.initializeGeminiChat(username, documentText);
}

/**
 * 채팅 응답 생성 함수
 */
export async function generateChatResponse(
  messages: string[],
  chatId?: string
): Promise<ChatResponseData> {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return {
      success: false,
      error: "유효한 메시지가 제공되지 않았습니다.",
    };
  }

  return await geminiManager.generateChatResponse(messages, chatId);
}

/**
 * 문서 컨텍스트 설정 함수
 */
export async function setDocumentContext(
  username: string,
  documentText: string
): Promise<DocumentContextResponse> {
  if (!username || !documentText) {
    return {
      success: false,
      error: "사용자 이름 또는 문서 내용이 없습니다.",
    };
  }

  return geminiManager.setDocumentContext(username, documentText);
}

/**
 * 문서 컨텍스트 가져오기 함수
 */
export async function getDocumentContext(
  username: string
): Promise<DocumentContextResponse> {
  if (!username) {
    return {
      success: false,
      error: "사용자 이름이 제공되지 않았습니다.",
    };
  }

  const result = geminiManager.getDocumentContext(username);

  // 사용자 정보가 없는 경우에도 오류 대신 빈 상태 반환
  if (!result.success) {
    return {
      success: true,
      hasDocument: false,
      textLength: 0,
      isInitialized: false,
    };
  }

  // 문서 컨텍스트가 있는지 확인
  const hasDocument = !!result.data && result.data.length > 10;
  const documentPreview = result.data
    ? result.data.substring(0, 100) + "..."
    : "";

  return {
    success: true,
    hasDocument: hasDocument,
    textLength: result.data ? result.data.length : 0,
    isInitialized: hasDocument,
    documentPreview: documentPreview,
  };
}

/**
 * 디버그 정보 가져오기 함수
 */
export async function getDebugInfo() {
  return geminiManager.getDebugInfo();
}

/**
 * Gemini 모델 generateContent 직접 호출 함수
 */
export async function generateContentFromModel(contents: ContentListUnion) {
  const result = await geminiManager.generateContentFromModel({
    contents,
  });
  return result.text;
}
