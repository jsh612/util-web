import { Chat, GoogleGenAI } from "@google/genai";
import { createServer } from "http";

// 환경 변수 설정
const hostname = "localhost";
const port = process.env.CUSTOM_SERVER_PORT
  ? parseInt(process.env.CUSTOM_SERVER_PORT)
  : 6000;

// Gemini API 키 설정
const API_KEY = process.env.GEMINI_API_KEY || "";

// Google Generative AI 인스턴스 생성
export const genAI = new GoogleGenAI({ apiKey: API_KEY });

// 사용자 채팅 타입 정의
interface UserChat {
  history: string[];
  lastActive: number;
  documentContext: string;
  chatInstance?: Chat;
}

// 전역 상태 관리
class GeminiState {
  private static instance: GeminiState;
  private userChats: Map<string, UserChat>;
  private documentContexts: Map<string, string>;

  private constructor() {
    this.userChats = new Map<string, UserChat>();
    this.documentContexts = new Map<string, string>();
    console.log("GeminiState 싱글톤 인스턴스 생성됨");
  }

  public static getInstance(): GeminiState {
    if (!GeminiState.instance) {
      GeminiState.instance = new GeminiState();
    }
    return GeminiState.instance;
  }

  public getUserChats(): Map<string, UserChat> {
    return this.userChats;
  }

  public getDocumentContexts(): Map<string, string> {
    return this.documentContexts;
  }

  public getDebugInfo() {
    return {
      totalSessions: this.userChats.size,
      chatIds: Array.from(this.userChats.keys()),
      documentContexts: {
        totalKeys: this.documentContexts.size,
        keys: Array.from(this.documentContexts.keys()),
      },
    };
  }
}

// 전역 Gemini 상태 객체 내보내기
export const geminiState = GeminiState.getInstance();

// 간단한 상태 유지 서버 시작 (Next.js와 통합되지 않음)
createServer((req, res) => {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // 간단한 상태 확인 API
  if (req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "running",
        stats: geminiState.getDebugInfo(),
      })
    );
    return;
  }

  // 기본 응답
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Gemini Chat State Server");
}).listen(port, () => {
  console.log(
    `> Gemini Chat 상태 관리 서버가 http://${hostname}:${port}에서 실행 중입니다`
  );
});
