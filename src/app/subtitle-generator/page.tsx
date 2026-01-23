"use client";

import { API_ROUTES } from "@/constants/routes";
import { downloadFile } from "@/utils/file-download";
import axios from "axios";
import { ChangeEvent, useRef, useState } from "react";

export default function SubtitleGeneratorPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("large");
  const [language, setLanguage] = useState("ko");
  const [detailLevel, setDetailLevel] = useState("detailed");
  const [srtContent, setSrtContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 지원하는 파일 형식 확인
    const supportedFormats = [
      ".wav",
      ".mp3",
      ".m4a",
      ".flac",
      ".ogg",
      ".wma",
      ".aac",
      ".mp4",
      ".mov",
      ".avi",
      ".mkv",
    ];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    
    if (!supportedFormats.includes(fileExt)) {
      alert(`지원하지 않는 파일 형식입니다: ${fileExt}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setAudioFile(file);
    setSrtContent(null);
    setError(null);
  };

  const generateSubtitle = async () => {
    if (!audioFile) {
      alert("오디오 또는 비디오 파일을 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSrtContent(null);

    try {
      const formData = new FormData();
      formData.append("audioFile", audioFile);
      formData.append("model", model);
      formData.append("language", language);
      formData.append("detailLevel", detailLevel);

      const response = await axios.post(API_ROUTES.SUBTITLE_GENERATE, formData, {
        responseType: "text",
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSrtContent(response.data);
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.error ||
            "자막 생성 중 오류가 발생했습니다."
        );
      } else {
        setError("자막 생성 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSrt = async () => {
    if (!srtContent) return;

    const fileName = audioFile
      ? `${audioFile.name.substring(0, audioFile.name.lastIndexOf("."))}.srt`
      : "subtitle.srt";

    const blob = new Blob([srtContent], { type: "text/plain; charset=utf-8" });

    await downloadFile(blob, fileName, {
      description: "SRT Subtitle",
      accept: {
        "text/plain": [".srt"],
      },
    });
  };

  const copyToClipboard = () => {
    if (!srtContent) return;
    navigator.clipboard.writeText(srtContent);
    alert("자막 내용이 클립보드에 복사되었습니다.");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          자막 생성기
        </h1>
        <p className="text-slate-300">
          음성 또는 비디오 파일에서 자동으로 자막(.srt) 파일을 생성합니다.
        </p>
      </div>

      <div className="space-y-6">
        {/* 파일 업로드 */}
        <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">
            파일 선택
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.m4a,.flac,.ogg,.wma,.aac,.mp4,.mov,.avi,.mkv"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600"
          />
          {audioFile && (
            <p className="mt-2 text-sm text-slate-400">
              선택된 파일: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* 설정 옵션 */}
        <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">설정</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                모델 크기
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="tiny">Tiny (빠름, 낮은 정확도)</option>
                <option value="base">Base (빠름, 보통 정확도)</option>
                <option value="small">Small (보통, 좋은 정확도)</option>
                <option value="medium">Medium (느림, 매우 좋은 정확도)</option>
                <option value="large">Large (매우 느림, 최고 정확도)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                언어
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="ko">한국어</option>
                <option value="en">영어</option>
                <option value="auto">자동 감지</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                상세도
              </label>
              <select
                value={detailLevel}
                onChange={(e) => setDetailLevel(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="detailed">매우 상세 (숏폼 최적화)</option>
                <option value="normal">일반</option>
                <option value="simple">간단</option>
              </select>
            </div>
          </div>
        </div>

        {/* 생성 버튼 */}
        <button
          onClick={generateSubtitle}
          disabled={!audioFile || isLoading}
          className="w-full px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "자막 생성 중..." : "자막 생성하기"}
        </button>

        {/* 오류 메시지 */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
            <p className="font-semibold">오류</p>
            <p>{error}</p>
          </div>
        )}

        {/* 결과 표시 */}
        {srtContent && (
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-200">
                생성된 자막
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
                >
                  복사
                </button>
                <button
                  onClick={downloadSrt}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm transition-colors"
                >
                  다운로드
                </button>
              </div>
            </div>
            <pre className="p-4 bg-slate-900/50 rounded-lg text-sm text-slate-300 overflow-auto max-h-96">
              {srtContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
