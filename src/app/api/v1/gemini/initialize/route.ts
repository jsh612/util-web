import { getGeminiChatManager } from "@/utils/gemini";
import { NextRequest, NextResponse } from "next/server";

const geminiChatManager = getGeminiChatManager();

export interface InitializeRequest {
  username: string;
  documentText?: string;
  action: "initialize";
}

export interface InitializeResponse {
  success: boolean;
  error?: string;
  chatId?: string;
}

const validUsers = process.env.TEMP_PASSIBLE_USER?.split(",") || [];

export async function POST(request: NextRequest) {
  try {
    const { username, documentText } =
      (await request.json()) as InitializeRequest;

    if (!username) {
      return NextResponse.json(
        { error: "사용자 이름이 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    if (!validUsers.includes(username)) {
      return NextResponse.json(
        { error: "유효하지 않은 사용자 이름입니다." },
        { status: 403 }
      );
    }

    const result = await geminiChatManager.initializeGeminiChat(
      username,
      documentText
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      chatId: result.chatId,
    });
  } catch (error) {
    console.error("Gemini 초기화 오류:", error);
    return NextResponse.json(
      { error: "초기화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
