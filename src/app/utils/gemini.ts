import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini API 키 설정
const API_KEY = process.env.GEMINI_API_KEY || "";

// 기본 Gemini 모델 설정 (환경 변수가 없으면 기본값 사용)
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// Google Generative AI 인스턴스 생성
export const genAI = new GoogleGenerativeAI(API_KEY);

// Gemini 모델 사용
export const getGeminiModel = () => {
  if (!API_KEY) {
    console.error("Gemini API 키가 설정되지 않았습니다.");
  }
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1000,
    },
  });
};

// 사용자별 채팅 기록 저장
interface UserChat {
  history: string[];
  lastActive: number;
  documentContext: string; // PDF에서 추출한 컨텍스트, 옵션이 아님
}

// 사용자 채팅 기록 관리 (24시간 후 만료)
// 서버리스 환경에서 메모리 데이터가 유지되지 않는 문제가 있으므로,
// 중요 데이터는 클라이언트와 서버 간에 매번 전달하는 방식으로 변경 필요
const userChats = new Map<string, UserChat>();

// 문서 컨텍스트를 별도로 저장 (서버 재시작시에도 유지되어야 하는 데이터)
// 실제 프로덕션에서는 Redis나 데이터베이스로 변경해야 함
const documentContexts = new Map<string, string>();

// 주기적으로 오래된 채팅 기록 정리 (1시간마다)
const EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24시간
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1시간

if (typeof window !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [username, chat] of userChats.entries()) {
      if (now - chat.lastActive > EXPIRY_TIME) {
        userChats.delete(username);
      }
    }
  }, CLEANUP_INTERVAL);
}

// 사용자 이름 추출 함수
const extractUsername = (message: string): string | null => {
  const match = message.match(/^\[사용자:\s*([^\]]+)\]/);
  return match ? match[1].trim() : null;
};

// PDF 문서 컨텍스트 설정
export const setDocumentContext = (username: string, documentText: string) => {
  if (!username || !documentText) {
    console.error("사용자 이름 또는 문서 내용이 없습니다.");
    return {
      success: false,
      error: "사용자 이름 또는 문서 내용이 없습니다.",
    };
  }

  try {
    // 문서 컨텍스트를 별도 맵에 저장
    documentContexts.set(username, documentText);

    // 채팅 기록 맵에도 저장 (필요시)
    if (!userChats.has(username)) {
      userChats.set(username, {
        history: [],
        lastActive: Date.now(),
        documentContext: documentText,
      });
    } else {
      const userChat = userChats.get(username)!;
      userChat.documentContext = documentText;
      userChat.lastActive = Date.now();
    }

    // 설정 확인
    const hasContext = documentContexts.has(username);

    // 응답에 실제 텍스트 일부 포함 (API 응답으로 전달하여 클라이언트에서 저장할 수 있도록)
    return {
      success: true,
      hasDocument: hasContext,
      textLength: documentText.length,
      documentKey: `doc_${username}_${Date.now()}`, // 문서 키 생성
      documentPreview: documentText.substring(0, 100) + "...", // 미리보기 (클라이언트에서 확인용)
    };
  } catch (error) {
    console.error("문서 컨텍스트 설정 오류:", error);
    return {
      success: false,
      error: String(error),
    };
  }
};

// API 요청에서 문서 컨텍스트 받기
export const receiveDocumentContext = (
  username: string,
  documentText: string
) => {
  if (!username || !documentText) {
    console.error("API 요청에서 문서 컨텍스트 수신 실패");
    return false;
  }

  try {
    // 문서 컨텍스트 맵에 저장
    documentContexts.set(username, documentText);

    // 채팅 기록에도 동기화
    if (userChats.has(username)) {
      const userChat = userChats.get(username)!;
      userChat.documentContext = documentText;
    } else {
      userChats.set(username, {
        history: [],
        lastActive: Date.now(),
        documentContext: documentText,
      });
    }

    return true;
  } catch (error) {
    console.error("문서 컨텍스트 수신 오류:", error);
    return false;
  }
};

// 현재 설정된 문서 컨텍스트 가져오기
export const getDocumentContext = (username: string) => {
  if (!username) {
    console.error("사용자 이름이 제공되지 않았습니다.");
    return {
      success: false,
      error: "사용자 이름이 제공되지 않았습니다.",
    };
  }

  // 1. 문서 컨텍스트 맵에서 확인
  const documentText = documentContexts.get(username);

  if (documentText) {
    // 사용자 채팅 기록에도 문서 컨텍스트 동기화
    if (userChats.has(username)) {
      const userChat = userChats.get(username)!;
      userChat.documentContext = documentText;
    } else {
      // 채팅 기록 없으면 새로 생성
      userChats.set(username, {
        history: [],
        lastActive: Date.now(),
        documentContext: documentText,
      });
    }

    return {
      success: true,
      data: documentText,
      hasDocument: true,
    };
  }

  // 2. 사용자 채팅 기록에서 확인
  if (userChats.has(username)) {
    const userChat = userChats.get(username)!;
    const chatDocumentText = userChat.documentContext;

    if (chatDocumentText && chatDocumentText.length > 0) {
      // 맵에 동기화
      documentContexts.set(username, chatDocumentText);

      return {
        success: true,
        data: chatDocumentText,
        hasDocument: true,
      };
    }
  }

  // 3. 문서 컨텍스트가 없는 경우

  // 새 사용자인 경우 초기 상태 생성
  if (!userChats.has(username)) {
    userChats.set(username, {
      history: [],
      lastActive: Date.now(),
      documentContext: "",
    });
  }

  return {
    success: true,
    data: "",
    hasDocument: false,
  };
};

// 텍스트 기반 채팅 메시지 생성
export const generateChatResponse = async (messages: string[]) => {
  try {
    if (messages.length === 0) {
      return {
        success: false,
        error: "메시지가 제공되지 않았습니다.",
      };
    }

    const lastMessage = messages[messages.length - 1];
    const username = extractUsername(lastMessage);

    if (!username) {
      return {
        success: true,
        data: "답변이 불가합니다",
      };
    }

    // 사용자 메시지가 Q&A 형식인지 확인
    const isQuestionFormat = lastMessage.startsWith(`[사용자: ${username}]`);
    if (!isQuestionFormat) {
      return {
        success: true,
        data: "해당 요청은 처리할 수 없습니다.",
      };
    }

    // 사용자별 채팅 기록 관리
    if (!userChats.has(username)) {
      userChats.set(username, {
        history: [],
        lastActive: Date.now(),
        documentContext: "", // 빈 문서 컨텍스트로 초기화
      });
    }

    const userChat = userChats.get(username)!;
    userChat.lastActive = Date.now();

    // 문서 컨텍스트 맵에서 직접 확인
    let documentText = documentContexts.get(username) || "";

    // documentContext 속성 확인 및 설정
    if (
      !documentText &&
      userChat.documentContext &&
      userChat.documentContext.length > 0
    ) {
      documentText = userChat.documentContext;
      // 맵에 동기화
      documentContexts.set(username, documentText);
    } else if (documentText && documentText.length > 0) {
      // 유저 채팅에 동기화
      userChat.documentContext = documentText;
    }

    // 사용자의 이전 대화 기록 업데이트
    if (messages.length > 1) {
      // 사용자 채팅 기록에 최신 메시지만 추가
      userChat.history = [...userChat.history, lastMessage];
    } else {
      // 첫 메시지인 경우
      userChat.history = [lastMessage];
    }

    // 최대 10개의 최근 메시지만 유지
    if (userChat.history.length > 10) {
      userChat.history = userChat.history.slice(-10);
    }

    // 문서 컨텍스트 확인 - 맵에서 직접 확인
    const hasDocumentContext = !!documentText && documentText.length > 10;

    // 문서가 없는 경우 알림
    if (!hasDocumentContext) {
      return {
        success: true,
        data: "문서가 업로드되지 않았거나 초기화되지 않았습니다. 먼저 PDF 문서를 업로드하고 Gemini를 초기화해 주세요.",
      };
    }

    try {
      const model = getGeminiModel();
      const generationConfig = {
        temperature: 0.2, // 응답의 일관성을 높이기 위해 온도를 낮게 설정
        maxOutputTokens: 1000, // 응답 길이 제한
        topK: 40, // 다양성 조절
        topP: 0.8, // 응답의 예측가능성 조절
      };

      const chat = model.startChat({
        history: userChat.history.slice(0, -1).map((message, index) => ({
          role: index % 2 === 0 ? "user" : "model",
          parts: [{ text: message }],
        })),
        generationConfig,
      });

      // AI가 응답을 생성하기 전에 주요 안내사항 설정
      let systemPrompt = `
      당신은 웹 사이트의 Q&A 챗봇입니다. 다음 규칙을 반드시 따라주세요:
      1. 첨부된 파일 내용과 관련된 질문에만 답변하세요.
      2. 질문/답변 외의 요청에는 "해당 요청은 처리할 수 없습니다."라고 응답하세요.
      3. 첨부된 문서에 없는 내용이라면 "해당 내용은 문서에 없습니다. 담당자에게 문의하세요."라고 안내하세요.
      4. 현재 질문은 "${username}" 사용자의 질문입니다. 이 사용자와의 대화 기록만 고려하세요.
      5. 간결하고 명확하게 답변하세요.
      `;

      // 문서 컨텍스트가 있는 경우 추가
      if (hasDocumentContext) {
        systemPrompt += `\n\n==== 문서 컨텍스트 시작 ====\n${documentText}\n==== 문서 컨텍스트 끝 ====\n`;
        systemPrompt += `\n위 문서 컨텍스트를 기반으로 질문에 답변하세요. 이 문서에서 찾을 수 없는 정보는 "해당 내용은 문서에 없습니다."라고 응답하세요.`;
      } else {
        systemPrompt += `\n\n주의: 현재 업로드된 문서가 없습니다. "해당 내용은 문서에 없습니다. 담당자에게 문의하세요."라고 응답하세요.`;
      }

      try {
        // 프롬프트와 함께 메시지 전송
        const result = await chat.sendMessage(
          systemPrompt + "\n\n" + lastMessage
        );
        const response = await result.response;
        const text = response.text();
        return { success: true, data: text };
      } catch (modelError) {
        console.error("Gemini 모델 응답 오류:", modelError);
        return {
          success: false,
          error: `Gemini 응답 생성 오류: ${String(modelError)}`,
        };
      }
    } catch (chatError) {
      console.error("채팅 인스턴스 생성 오류:", chatError);
      return {
        success: false,
        error: `채팅 세션 생성 오류: ${String(chatError)}`,
      };
    }
  } catch (error) {
    console.error("전체 Gemini API 처리 오류:", error);
    return {
      success: false,
      error: `메시지 생성 중 오류: ${String(error)}`,
    };
  }
};
