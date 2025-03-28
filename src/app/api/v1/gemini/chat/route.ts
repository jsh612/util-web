import {
  generateChatResponse,
  receiveDocumentContext,
} from "@/app/utils/gemini";
import { NextRequest, NextResponse } from "next/server";

// 사용자 이름 추출 함수
const extractUsername = (message: string): string | null => {
  const match = message.match(/^\[사용자:\s*([^\]]+)\]/);
  return match ? match[1].trim() : null;
};

export async function POST(request: NextRequest) {
  try {
    const { messages, documentText } = await request.json();

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

    // 문서 컨텍스트가 전달되었다면 서버 메모리에 설정
    if (
      documentText &&
      typeof documentText === "string" &&
      documentText.length > 0
    ) {
      receiveDocumentContext(username, documentText);
    }

    const result = await generateChatResponse(messages);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ response: result.data });
  } catch (error) {
    console.error("Gemini 챗봇 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
