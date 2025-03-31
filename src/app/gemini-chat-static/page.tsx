"use client";

import {
  InitializeRequest,
  InitializeResponse,
} from "@/app/api/v1/gemini/initialize/route";
import MainLayout from "@/components/layout/MainLayout";
import { API_ROUTES } from "@/constants/routes";
import { APP_DESCRIPTION } from "@/constants/temp-data";
import axios from "axios";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const [initializingGemini, setInitializingGemini] = useState(false);
  const [chatId, setChatId] = useState<string | undefined>();

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !username.trim() || !chatId) return;

    const formattedMessage = `[사용자: ${username}] ${input.trim()}`;
    const userMessage = formattedMessage;
    setInput("");
    setIsLoading(true);

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user" as const, content: userMessage },
    ];
    setMessages(updatedMessages);

    try {
      const messageHistory = updatedMessages.map((msg) => msg.content);

      const response = await axios.post(API_ROUTES.GEMINI_CHAT, {
        messages: messageHistory,
        chatId: chatId,
      });

      setMessages([
        ...updatedMessages,
        { role: "bot" as const, content: response.data.response },
      ]);

      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);
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
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
        }
      }, 300);
    }
  };

  const initializeGemini = async () => {
    try {
      setInitializingGemini(true);
      const response = await axios.post<
        InitializeResponse,
        { data: InitializeResponse },
        InitializeRequest
      >(API_ROUTES.GEMINI_INITIALIZE, {
        username: username,
        documentText: APP_DESCRIPTION,
      });

      if (response.data.success && response.data.chatId) {
        setChatId(response.data.chatId);
        setInitializingGemini(false);
        setMessages([
          {
            role: "bot",
            content: "설정이 완료되었습니다. 채팅을 시작하세요.",
          },
        ]);
        setTimeout(() => {
          if (chatInputRef.current) {
            chatInputRef.current.focus();
          }
        }, 300);
      } else {
        console.error("Gemini 초기화 실패:", response.data.error);
        setInitializingGemini(false);
        setMessages([
          {
            role: "bot",
            content:
              "채팅 초기화에 실패했습니다: " +
              (response.data.error || "알 수 없는 오류"),
          },
        ]);
      }
    } catch (error) {
      console.error("Gemini 초기화 오류:", error);
      setMessages([
        {
          role: "bot",
          content: "유효하지 않은 사용자 이름입니다. 다시 시도해 주세요.",
        },
      ]);
      setInitializingGemini(false);
    } finally {
      setInitializingGemini(false);
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        "모든 설정을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      // 채팅 메시지 초기화
      setMessages([]);

      // 입력 필드 초기화
      setUsername("");

      // chatId 초기화
      setChatId(undefined);

      // 초기화 안내 메시지
      setMessages([
        {
          role: "bot",
          content:
            "모든 설정이 초기화되었습니다. 사용자 이름을 입력하고 새로운 대화를 시작하세요.",
        },
      ]);
    }
  };

  useEffect(() => {
    if (username || initializingGemini) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);
    }
  }, [username, initializingGemini]);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col space-y-4 mb-8">
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            Q&A 챗봇
          </h1>
          <p className="text-slate-300">AI 챗봇과 대화를 시작해보세요.</p>
        </div>

        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">
            사용자 설정
          </h2>

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
              className="w-full py-2 px-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
            {username && (
              <p className="text-xs text-teal-400 mt-1">
                안녕하세요, {username}님!
              </p>
            )}
          </div>
        </div>

        <div className="flex space-x-2 w-full mb-4">
          <button
            type="button"
            onClick={initializeGemini}
            disabled={!username || initializingGemini}
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
              <span>{chatId ? "채팅 재설정" : "채팅 시작"}</span>
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
                  사용자 이름을 입력하고 대화를 시작하세요.
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
                      : !chatId
                      ? "채팅을 시작하려면 채팅 시작 버튼을 눌러주세요"
                      : "메시지를 입력하세요..."
                  }
                  className="flex-1 py-3 px-4 bg-slate-700/30 border border-slate-600/50 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  disabled={isLoading || !username || !chatId}
                />
                <button
                  type="submit"
                  className={`rounded-xl px-6 font-medium ${
                    isLoading || !input.trim() || !username || !chatId
                      ? "bg-slate-700/70 text-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-teal-500 to-blue-500 text-white hover:shadow-md hover:shadow-teal-500/20 transition-all"
                  }`}
                  disabled={isLoading || !input.trim() || !username || !chatId}
                >
                  전송
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
