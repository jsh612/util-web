import { Chat, GoogleGenAI } from "@google/genai";

// 서버 사이드에서 실행될 때만 서버 모듈을 임포트
let geminiState: {
  getUserChats: () => Map<string, UserChat>;
  getDocumentContexts: () => Map<string, string>;
} | null = null;

// 서버 사이드에서만 실행
if (typeof window === "undefined") {
  try {
    // 동적으로 서버 모듈 임포트 - 간소화된 방식
    const importDynamic = new Function(
      "modulePath",
      "return import(modulePath)"
    );
    importDynamic("../../../server")
      .then((serverModule: { geminiState: typeof geminiState }) => {
        geminiState = serverModule.geminiState;
        console.log("서버 모듈에서 Gemini 상태를 가져왔습니다");
      })
      .catch((error: Error) => {
        console.warn(
          "서버 모듈 가져오기 실패. 로컬 상태를 사용합니다:",
          error.message
        );
      });
  } catch (error) {
    console.warn("동적 임포트 실패. 로컬 상태를 사용합니다:", error);
  }
}

// Gemini API 키 설정
const API_KEY = process.env.GEMINI_API_KEY || "";

// 기본 Gemini 모델 설정 (환경 변수가 없으면 기본값 사용)
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// Google Generative AI 인스턴스 생성
export const genAI = new GoogleGenAI({ apiKey: API_KEY });

// 서버리스 환경에서 상태를 유지하기 위한 캐시
interface GlobalWithCache {
  userChats: Map<string, UserChat>;
  documentContexts: Map<string, string>;
}

// globalThis에 확장 속성을 추가하여 서버리스 환경에서 상태 유지
const globalCache = globalThis as unknown as GlobalWithCache;

// 서버 모듈이 없을 경우에만 글로벌 캐시 초기화
if (!geminiState) {
  if (!globalCache.userChats) {
    globalCache.userChats = new Map<string, UserChat>();
    console.log("글로벌 userChats 초기화됨");
  }

  if (!globalCache.documentContexts) {
    globalCache.documentContexts = new Map<string, string>();
    console.log("글로벌 documentContexts 초기화됨");
  }
}

export interface InitializeResult {
  success: boolean;
  error?: string;
  chatId?: string;
  chatInstance?: Chat;
}

export interface UserChat {
  history: string[];
  lastActive: number;
  documentContext: string;
  chatInstance?: Chat; // Gemini 채팅 인스턴스 저장
}

/**
 * Gemini 채팅 관리 클래스
 * 사용자별 채팅 인스턴스와 문서 컨텍스트를 관리하는 클래스
 */
export class GeminiChatManager {
  private readonly EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24시간
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1시간
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    console.log("GeminiChatManager 생성");

    // 서버 환경에서만 실행
    if (typeof window === "undefined") {
      // 중복 타이머 방지를 위해 기존 타이머 제거
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }

      // 주기적으로 오래된 채팅 기록 정리 (1시간마다)
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredChats();
      }, this.CLEANUP_INTERVAL);
    }
  }

  // 전역 캐시 접근 메서드
  private get userChats(): Map<string, UserChat> {
    // 서버 모듈이 있으면 서버 상태를 사용
    if (geminiState) {
      return geminiState.getUserChats();
    }
    // 없으면 글로벌 캐시 사용
    return globalCache.userChats;
  }

  private get documentContexts(): Map<string, string> {
    // 서버 모듈이 있으면 서버 상태를 사용
    if (geminiState) {
      return geminiState.getDocumentContexts();
    }
    // 없으면 글로벌 캐시 사용
    return globalCache.documentContexts;
  }

  /**
   * 사용자 이름 추출 함수
   */
  private extractUsername(message: string): string | null {
    const match = message.match(/^\[사용자:\s*([^\]]+)\]/);
    return match ? match[1].trim() : null;
  }

  /**
   * 만료된 채팅 세션 정리
   */
  private cleanupExpiredChats() {
    try {
      const now = Date.now();
      let cleanupCount = 0;

      for (const [chatId, chat] of this.userChats.entries()) {
        if (now - chat.lastActive > this.EXPIRY_TIME) {
          this.userChats.delete(chatId);
          cleanupCount++;
        }
      }

      if (cleanupCount > 0) {
        console.log(`만료된 채팅 세션 ${cleanupCount}개 정리됨`);
      }
    } catch (error) {
      console.error("채팅 세션 정리 중 오류:", error);
    }
  }

  /**
   * 현재 저장된 모든 채팅 세션 정보 반환 (디버깅용)
   */
  getDebugInfo() {
    return {
      totalSessions: this.userChats.size,
      chatIds: Array.from(this.userChats.keys()),
      documentContexts: {
        totalKeys: this.documentContexts.size,
        keys: Array.from(this.documentContexts.keys()),
      },
    };
  }

  /**
   * 채팅 ID로 채팅 인스턴스 찾기
   */
  findChatSessionById(
    chatId: string
  ): { username: string; chatInstance: Chat } | null {
    try {
      // 디버깅을 위한 로그 추가
      console.log(`findChatSessionById 호출, chatId: ${chatId}`);
      console.log(`저장된 채팅 세션 수: ${this.userChats.size}`);
      console.log(`저장된 채팅 키: ${Array.from(this.userChats.keys())}`);

      // chatId에 해당하는 채팅 인스턴스 직접 조회
      const userChat = this.userChats.get(chatId);

      if (!userChat?.chatInstance) {
        console.error(`채팅 인스턴스를 찾을 수 없습니다. chatId: ${chatId}`);
        return null;
      }

      // chatId 형식: chat_username_timestamp에서 username 추출
      const parts = chatId.split("_");
      const username = parts.length >= 2 ? parts[1] : "unknown";

      return {
        username,
        chatInstance: userChat.chatInstance,
      };
    } catch (error) {
      console.error("채팅 세션 찾기 오류:", error);
      return null;
    }
  }

  /**
   * Gemini 채팅 초기화
   */
  async initializeGeminiChat(
    username: string,
    documentText?: string
  ): Promise<InitializeResult> {
    try {
      if (!username) {
        return {
          success: false,
          error: "사용자 이름이 제공되지 않았습니다.",
        };
      }

      let systemPrompt = `
      당신은 웹 사이트의 Q&A 챗봇입니다. 다음 규칙을 반드시 따라주세요:
      1. 첨부된 파일 내용과 관련된 질문에만 답변하세요.
      2. 질문/답변 외의 요청에는 "해당 요청은 처리할 수 없습니다."라고 응답하세요.
      3. 첨부된 문서에 없는 내용이라면 "해당 내용은 문서에 없습니다. 담당자에게 문의하세요."라고 안내하세요.
      4. 현재 질문은 "${username}" 사용자의 질문입니다. 이 사용자와의 대화 기록만 고려하세요.
      5. 간결하고 명확하게 답변하세요.
      `;

      if (documentText && documentText.length > 0) {
        systemPrompt += `\n\n==== 문서 컨텍스트 시작 ====\n${documentText}\n==== 문서 컨텍스트 끝 ====\n`;
        systemPrompt += `\n위 문서 컨텍스트를 기반으로 질문에 답변하세요. 이 문서에서 찾을 수 없는 정보는 "해당 내용은 문서에 없습니다."라고 응답하세요.`;
      }

      const chat = genAI.chats.create({
        model: GEMINI_MODEL,
        history: [],
        config: {
          temperature: 0.2,
          maxOutputTokens: 1000,
          topK: 40,
          topP: 0.8,
        },
      });

      // 시스템 프롬프트로 초기화
      await chat.sendMessage({
        message: systemPrompt,
      });

      const chatId = `chat_${username}_${Date.now()}`;

      // chatId 기반 채팅 기록 초기화
      this.userChats.set(chatId, {
        history: [],
        lastActive: Date.now(),
        documentContext: documentText || "",
        chatInstance: chat,
      });

      console.log(`채팅 초기화 완료, chatId: ${chatId}`);
      console.log(`현재 저장된 채팅 세션 수: ${this.userChats.size}`);

      return {
        success: true,
        chatId,
        chatInstance: chat,
      };
    } catch (error) {
      console.error("채팅 초기화 오류:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * 채팅 응답 생성
   */
  async generateChatResponse(messages: string[], chatId?: string) {
    try {
      if (messages.length === 0) {
        return {
          success: false,
          error: "메시지가 제공되지 않았습니다.",
        };
      }

      const lastMessage = messages[messages.length - 1];
      const username = this.extractUsername(lastMessage);

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

      // 채팅 인스턴스 찾기
      let chatInstance = null;

      // chatId가 제공된 경우 해당 ID로 채팅 인스턴스 찾기
      if (!chatId) {
        return {
          success: false,
          error: "채팅 ID가 제공되지 않았습니다. 먼저 초기화를 진행해주세요.",
        };
      }

      console.log(`generateChatResponse 호출, chatId: ${chatId}`);
      console.log(`저장된 채팅 세션 수: ${this.userChats.size}`);

      const session = this.findChatSessionById(chatId);

      if (session) {
        chatInstance = session.chatInstance;
      }

      // 채팅 인스턴스가 없으면 초기화 실패
      if (!chatInstance) {
        return {
          success: false,
          error:
            "채팅 인스턴스를 찾을 수 없습니다. 먼저 초기화를 진행해주세요.",
        };
      }

      try {
        const result = await chatInstance.sendMessage({
          message: lastMessage,
        });

        // 대화 기록 업데이트 - chatId를 키로 사용
        const userChat = this.userChats.get(chatId);
        if (userChat) {
          userChat.history.push(lastMessage);
          if (userChat.history.length > 10) {
            userChat.history = userChat.history.slice(-10);
          }
          userChat.lastActive = Date.now();

          // 맵을 갱신하여 변경 사항이 저장되도록 함
          this.userChats.set(chatId, userChat);
        }

        return { success: true, data: result.text };
      } catch (modelError) {
        console.error("Gemini 모델 응답 오류:", modelError);
        return {
          success: false,
          error: `Gemini 응답 생성 오류: ${String(modelError)}`,
        };
      }
    } catch (error) {
      console.error("전체 Gemini API 처리 오류:", error);
      return {
        success: false,
        error: `메시지 생성 중 오류: ${String(error)}`,
      };
    }
  }

  /**
   * PDF 문서 컨텍스트 설정
   */
  setDocumentContext(username: string, documentText: string) {
    if (!username || !documentText) {
      console.error("사용자 이름 또는 문서 내용이 없습니다.");
      return {
        success: false,
        error: "사용자 이름 또는 문서 내용이 없습니다.",
      };
    }

    try {
      // 문서 컨텍스트를 별도 맵에 저장
      this.documentContexts.set(username, documentText);

      // 채팅 기록 맵에도 저장 (필요시)
      const userChatKey = Array.from(this.userChats.keys()).find((key) =>
        key.includes(`_${username}_`)
      );

      if (userChatKey) {
        const userChat = this.userChats.get(userChatKey)!;
        userChat.documentContext = documentText;
        userChat.lastActive = Date.now();

        // 맵을 갱신하여 변경 사항이 저장되도록 함
        this.userChats.set(userChatKey, userChat);
      }

      // 설정 확인
      const hasContext = this.documentContexts.has(username);

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
  }

  /**
   * API 요청에서 문서 컨텍스트 받기
   */
  receiveDocumentContext(username: string, documentText: string) {
    if (!username || !documentText) {
      console.error("API 요청에서 문서 컨텍스트 수신 실패");
      return false;
    }

    try {
      // 문서 컨텍스트 맵에 저장
      this.documentContexts.set(username, documentText);

      return true;
    } catch (error) {
      console.error("문서 컨텍스트 수신 오류:", error);
      return false;
    }
  }

  /**
   * 현재 설정된 문서 컨텍스트 가져오기
   */
  getDocumentContext(username: string) {
    if (!username) {
      console.error("사용자 이름이 제공되지 않았습니다.");
      return {
        success: false,
        error: "사용자 이름이 제공되지 않았습니다.",
      };
    }

    // 문서 컨텍스트 맵에서 확인
    const documentText = this.documentContexts.get(username);

    if (documentText) {
      return {
        success: true,
        data: documentText,
        hasDocument: true,
      };
    }

    return {
      success: true,
      data: "",
      hasDocument: false,
    };
  }
}

// 싱글톤 인스턴스 생성
export const geminiChatManager = new GeminiChatManager();
