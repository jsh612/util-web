import { getGeminiChatManager } from "@/app/utils/gemini";
import { GenerateContentResponseUsageMetadata } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const geminiChatManager = getGeminiChatManager();

export interface ChatRequest {
  messages: string[];
  chatId?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    text: string | undefined;
    usageMetadata: GenerateContentResponseUsageMetadata | undefined;
  };
  error?: undefined;
}

export interface ErrorResponse {
  error: string;
}

// 사용자 이름 추출 함수
const extractUsername = (message: string): string | null => {
  const match = message.match(/^\[사용자:\s*([^\]]+)\]/);
  return match ? match[1].trim() : null;
};

export async function POST(request: NextRequest) {
  try {
    const { messages, chatId } = (await request.json()) as ChatRequest;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "유효한 메시지가 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    // 사용자 이름 추출
    const lastMessage = messages[messages.length - 1];
    const username = extractUsername(lastMessage);

    if (!username) {
      return NextResponse.json(
        { error: "메시지에서 사용자 이름을 추출할 수 없습니다." },
        { status: 400 }
      );
    }

    // chatId가 없으면 오류 반환
    if (!chatId) {
      return NextResponse.json(
        { error: "채팅 ID가 제공되지 않았습니다. 먼저 초기화를 진행해주세요." },
        { status: 400 }
      );
    }

    // chatId를 통해 채팅 응답 생성
    const result = await geminiChatManager.generateChatResponse(
      messages,
      chatId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Gemini 챗봇 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
