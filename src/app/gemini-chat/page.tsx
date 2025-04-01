"use client";

import { ChatRequest, ChatResponse } from "@/app/api/v1/gemini/chat/route";
import {
  InitializeRequest,
  InitializeResponse,
} from "@/app/api/v1/gemini/initialize/route";
import MainLayout from "@/components/layout/MainLayout";
import { API_ROUTES } from "@/constants/routes";
import { GenerateContentResponseUsageMetadata } from "@google/genai";
import axios, { AxiosError } from "axios";
import React, { FormEvent, useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "bot";
  content: string;
}

export default function GeminiChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initializingGemini, setInitializingGemini] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [documentStatus, setDocumentStatus] = useState<{
    hasDocument: boolean;
    textLength: number;
    isInitialized: boolean;
  }>({ hasDocument: false, textLength: 0, isInitialized: false });

  const [chatId, setChatId] = useState<string | undefined>();

  const [usageMetadata, setUsageMetadata] = useState<
    GenerateContentResponseUsageMetadata | undefined
  >();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
  };

  // PDF 파일 선택 처리
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.includes("pdf")) {
      alert("PDF 파일만 업로드할 수 있습니다.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 선택한 파일 저장 (아직 업로드하지 않음)
    setSelectedPdf(file);
    setDocumentStatus((prev) => ({
      ...prev,
      hasDocument: false,
      isInitialized: false,
    }));

    // 사용자 이름이 있다면 로컬 스토리지에 저장
    if (username) {
      localStorage.setItem("gemini_chat_username", username);
    }
  };

  // Gemini 초기화 (PDF 업로드 및 설정)
  const initializeGemini = async () => {
    if (!username || !selectedPdf) {
      alert("사용자 이름과 PDF 파일을 모두 입력해주세요.");
      return;
    }

    localStorage.setItem("gemini_chat_username", username);
    setInitializingGemini(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedPdf);
      formData.append("username", username);

      // 상태 메시지 추가
      const processingMessage: Message = {
        role: "bot",
        content: `${selectedPdf.name} 파일을 처리하고 챗봇을 초기화하는 중입니다... 잠시만 기다려주세요.`,
      };
      setMessages((prevMessages) => [...prevMessages, processingMessage]);

      const response = await axios.post(API_ROUTES.GEMINI_DOCUMENT, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        // 문서 텍스트 저장 (클라이언트 상태)
        if (response.data.documentText) {
          // 로컬 스토리지에 문서 저장
          const documentKey =
            response.data.documentKey || `doc_${username}_${Date.now()}`;
          localStorage.setItem("gemini_document_key", documentKey);
          localStorage.setItem(documentKey, response.data.documentText);
        }

        setDocumentStatus({
          hasDocument: true,
          textLength: response.data.textLength,
          isInitialized: true,
        });

        // 성공 메시지 상세화
        const textLengthKB =
          Math.round((response.data.textLength / 1024) * 10) / 10;
        const textLengthMB =
          Math.round((response.data.textLength / (1024 * 1024)) * 100) / 100;
        const newMessage: Message = {
          role: "bot",
          content: `PDF 파일이 성공적으로 처리되었습니다. 
          
- 파일명: ${selectedPdf.name}
- 추출된 텍스트: ${textLengthKB}KB (${textLengthMB}MB)
- 상태: 챗봇 설정이 완료되었습니다.

이제 문서 내용에 대해 질문할 수 있습니다.`,
        };

        // 처리 중 메시지를 성공 메시지로 대체
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          newMessages.pop(); // 처리 중 메시지 제거
          newMessages.push(newMessage); // 성공 메시지 추가
          return newMessages;
        });

        setSelectedPdf(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        // API 호출 - 문서 컨텍스트도 함께 전송
        const chatSessionResponse = await axios.post<
          InitializeResponse,
          { data: InitializeResponse },
          InitializeRequest
        >(API_ROUTES.GEMINI_INITIALIZE, {
          username: username,
          documentText: response.data.documentText,
        });

        if (
          chatSessionResponse.data.success &&
          chatSessionResponse.data.chatId
        ) {
          setChatId(chatSessionResponse.data.chatId);
        }
      }
    } catch (error: unknown) {
      console.error("챗봇 초기화 중 오류:", error);

      // 오류 메시지 상세화
      const errorMessage =
        error instanceof AxiosError && error.response?.data?.error
          ? error.response.data.error
          : "챗봇 초기화 중 오류가 발생했습니다.";

      // 처리 중 메시지를 오류 메시지로 대체
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages];
        newMessages.pop(); // 처리 중 메시지 제거
        newMessages.push({
          role: "bot",
          content: `오류: ${errorMessage}`,
        });
        return newMessages;
      });

      setDocumentStatus({
        hasDocument: false,
        textLength: 0,
        isInitialized: false,
      });
    } finally {
      setInitializingGemini(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !username.trim()) return;

    // 사용자 양식에 맞게 메시지 형식화
    const formattedMessage = `[사용자: ${username}] ${input.trim()}`;
    const userMessage = formattedMessage;
    setInput("");
    setIsLoading(true);

    // 사용자 메시지 추가
    const updatedMessages: Message[] = [
      ...messages,
      { role: "user" as const, content: userMessage },
    ];
    setMessages(updatedMessages);

    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 0);

    try {
      // API 요청에 필요한 메시지 형식으로 변환
      const messageHistory = updatedMessages.map((msg) => msg.content);

      // API 호출
      const newMessage = await axios.post<
        ChatResponse,
        { data: ChatResponse },
        ChatRequest
      >(API_ROUTES.GEMINI_CHAT, {
        messages: messageHistory,
        chatId: chatId,
      });

      if (newMessage.data.success && newMessage.data.data) {
        if (newMessage.data.data.usageMetadata) {
          setUsageMetadata(newMessage.data.data.usageMetadata);
        }

        if (newMessage.data.data.text) {
          setMessages([
            ...updatedMessages,
            {
              role: "bot" as const,
              content: newMessage.data.data.text,
            },
          ]);
        }
      } else {
        setMessages([
          ...updatedMessages,
          {
            role: "bot" as const,
            content: "죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.",
          },
        ]);
      }
    } catch (error) {
      console.error("챗봇 API 오류:", error);
      setMessages([
        ...updatedMessages,
        {
          role: "bot" as const,
          content: "죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
      // 응답 완료 후 입력란으로 포커스 이동
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
        }
      }, 300);
    }
  };

  // 기존 문서 삭제 처리를 재설정 기능으로 변경
  const handleReset = () => {
    if (
      window.confirm(
        "모든 설정을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      // 로컬 스토리지에서 문서 정보 삭제
      try {
        const savedDocumentKey = localStorage.getItem("gemini_document_key");
        if (savedDocumentKey) {
          localStorage.removeItem(savedDocumentKey);
          localStorage.removeItem("gemini_document_key");
        }
        localStorage.removeItem("gemini_chat_username");
      } catch (error) {
        console.error("로컬 스토리지 초기화 오류:", error);
      }

      // 모든 상태 초기화
      setUsername("");
      setSelectedPdf(null);
      setDocumentStatus({
        hasDocument: false,
        textLength: 0,
        isInitialized: false,
      });

      // 채팅 메시지 초기화
      setMessages([]);

      // 입력 필드 초기화
      setInput("");

      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // 초기화 안내 메시지
      setMessages([
        {
          role: "bot",
          content:
            "모든 설정이 초기화되었습니다. 사용자 이름을 입력하고 새 PDF 파일을 업로드하세요.",
        },
      ]);
    }
  };

  // 로컬 스토리지에서 사용자 이름 가져오기
  useEffect(() => {
    const savedUsername = localStorage.getItem("gemini_chat_username");
    if (savedUsername) {
      setUsername(savedUsername);
    }

    // 로컬 스토리지에서 문서 텍스트 복원
    try {
      const savedDocumentKey = localStorage.getItem("gemini_document_key");
      if (savedDocumentKey) {
        const savedDocumentText = localStorage.getItem(savedDocumentKey);
        if (savedDocumentText) {
          setDocumentStatus({
            hasDocument: true,
            textLength: savedDocumentText.length,
            isInitialized: true,
          });
        }
      }
    } catch (error) {
      console.error("로컬 스토리지에서 문서 복원 오류:", error);
    }
  }, []);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col space-y-4 mb-8">
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            Q&A 챗봇
          </h1>
          <p className="text-slate-300">
            문서 기반 Q&A 시스템입니다. 질문을 입력하시면 문서 내용을 기반으로
            답변해 드립니다.
          </p>
          <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
            <h3 className="text-slate-200 font-semibold mb-2">사용 안내</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-1 text-sm">
              <li>1단계: 사용자 이름을 입력하고 PDF 문서를 선택하세요.</li>
              <li>2단계: 챗봇 설정 버튼을 클릭하여 설정을 완료하세요.</li>
              <li>3단계: 초기화가 완료되면 질문을 입력할 수 있습니다.</li>
              <li>첨부된 문서 내용에 대한 질문만 답변 가능합니다.</li>
            </ul>
          </div>
        </div>

        {/* 단계별 설정 섹션 */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">
            1. 사용자 설정 및 문서 선택
          </h2>

          {/* 사용자 이름 입력 */}
          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              사용자 이름
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={handleUsernameChange}
              placeholder="이름을 입력하세요"
              disabled={documentStatus.isInitialized}
              className={`w-full py-2 px-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                documentStatus.isInitialized
                  ? "opacity-70 cursor-not-allowed"
                  : ""
              }`}
            />
            {username && (
              <p className="text-xs text-teal-400 mt-1">
                안녕하세요, {username}님!
              </p>
            )}
          </div>

          {/* 파일 선택 및 초기화 버튼 */}
          <div className="flex flex-col space-y-3 mb-4">
            <div className="w-full">
              <label
                htmlFor="pdfFile"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                PDF 파일 선택
              </label>
              <input
                type="file"
                id="pdfFile"
                onChange={handleFileChange}
                accept=".pdf"
                ref={fileInputRef}
                disabled={documentStatus.isInitialized}
                className={`w-full py-1.5 px-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-slate-600 file:text-slate-200 hover:file:bg-slate-500 ${
                  documentStatus.isInitialized
                    ? "opacity-70 cursor-not-allowed"
                    : ""
                }`}
              />
            </div>

            <div className="flex space-x-2 w-full">
              <button
                type="button"
                onClick={initializeGemini}
                disabled={
                  !selectedPdf ||
                  !username ||
                  initializingGemini ||
                  documentStatus.isInitialized
                }
                className="flex-1 flex items-center justify-center space-x-1 py-2 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
              >
                {initializingGemini ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>처리 중...</span>
                  </>
                ) : (
                  <span>챗봇 설정</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
              >
                설정 초기화
              </button>
            </div>
          </div>

          {/* 현재 상태 표시 */}
          <div className="bg-slate-700/20 rounded-lg p-3 text-xs text-slate-300 mb-4">
            <p>
              <span className="font-semibold text-slate-200">현재 상태:</span>{" "}
              {!username ? (
                <span className="text-yellow-400">
                  사용자 이름을 입력해주세요
                </span>
              ) : !selectedPdf && !documentStatus.hasDocument ? (
                <span className="text-yellow-400">PDF 파일을 선택해주세요</span>
              ) : selectedPdf && !documentStatus.isInitialized ? (
                <span className="text-yellow-400">챗봇 설정이 필요합니다</span>
              ) : documentStatus.isInitialized ? (
                <span className="text-green-400">준비 완료 (채팅 가능)</span>
              ) : (
                <span className="text-red-400">오류 발생</span>
              )}
            </p>
            {documentStatus.hasDocument && (
              <>
                <p className="mt-1">
                  <span className="font-semibold text-slate-200">
                    문서 크기:
                  </span>{" "}
                  {Math.round((documentStatus.textLength / 1024) * 10) / 10}KB
                  {" ("}
                  {Math.round(
                    (documentStatus.textLength / (1024 * 1024)) * 100
                  ) / 100}
                  MB{")"}
                </p>
                {documentStatus.textLength > 4 * 1024 * 1024 && (
                  <p className="mt-1 text-yellow-400">
                    <span className="font-semibold">주의:</span> 문서 크기가
                    크기 때문에 로컬 스토리지에 완전히 저장되지 않을 수
                    있습니다.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        {usageMetadata && (
          <div className="flex justify-end">
            <p className="text-lg text-teal-400 mt-1">
              프롬프트 토큰 사용량:{" "}
              {usageMetadata.promptTokenCount?.toLocaleString()}
            </p>
            <br />
            <p className="text-lg text-teal-400 mt-1">
              총 토큰 사용량: {usageMetadata.totalTokenCount?.toLocaleString()}
            </p>
            <br />
            <p className="text-lg text-teal-400 mt-1">
              응답 토큰 사용량:{" "}
              {usageMetadata.candidatesTokenCount?.toLocaleString()}
            </p>
          </div>
        )}

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg shadow-slate-900/20">
          <div className="h-[50vh] overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 rounded-full bg-gradient-to-br from-teal-500/20 to-blue-500/20 text-teal-400 mb-4">
                  <svg
                    className="w-12 h-12"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-200 mb-2">
                  Q&A 챗봇과 대화를 시작하세요
                </h2>
                <p className="text-slate-400 max-w-md">
                  {documentStatus.isInitialized
                    ? "챗봇 설정이 완료되었습니다. 질문을 입력하세요."
                    : "PDF 문서를 선택하고 챗봇 설정을 완료하세요."}
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-teal-500 to-blue-500 text-white"
                        : "bg-slate-700/70 text-slate-200 border border-slate-600/50"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl p-4 bg-slate-700/70 text-slate-200 border border-slate-600/50">
                  <div className="flex space-x-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse delay-75"></div>
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse delay-150"></div>
                    <span className="ml-2 text-slate-400">응답 생성 중...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-700/70 p-4">
            <form onSubmit={handleSubmit}>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  ref={chatInputRef}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    !username
                      ? "사용자 이름을 먼저 입력하세요"
                      : !documentStatus.isInitialized
                      ? "챗봇 설정을 완료하세요"
                      : "질문을 입력하세요..."
                  }
                  className="flex-1 py-3 px-4 bg-slate-700/30 border border-slate-600/50 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  disabled={
                    isLoading || !username || !documentStatus.isInitialized
                  }
                />
                <button
                  type="submit"
                  className={`rounded-xl px-6 font-medium ${
                    isLoading ||
                    !input.trim() ||
                    !username ||
                    !documentStatus.isInitialized
                      ? "bg-slate-700/70 text-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-teal-500 to-blue-500 text-white hover:shadow-md hover:shadow-teal-500/20 transition-all"
                  }`}
                  disabled={
                    isLoading ||
                    !input.trim() ||
                    !username ||
                    !documentStatus.isInitialized
                  }
                >
                  전송
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400">
            이 챗봇은 문서 기반 Q&A 시스템으로 구현되었습니다. 첨부된 문서에
            포함된 내용만 답변할 수 있습니다.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
