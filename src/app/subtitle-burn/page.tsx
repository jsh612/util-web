"use client";

import { API_ROUTES } from "@/constants/routes";
import { downloadFileFromUrl } from "@/utils/file-download";
import axios from "axios";
import { ChangeEvent, useRef, useState } from "react";

export default function SubtitleBurnPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 비디오 파일 형식 확인
    if (!file.type.startsWith("video/")) {
      alert("비디오 파일만 업로드할 수 있습니다.");
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    setVideoFile(file);
    setResultVideo(null);
    setError(null);

    // 비디오 미리보기
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const handleSrtChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // SRT 파일 확인
    if (!file.name.toLowerCase().endsWith(".srt")) {
      alert("SRT 파일만 업로드할 수 있습니다.");
      if (srtInputRef.current) srtInputRef.current.value = "";
      return;
    }

    setSrtFile(file);
    setResultVideo(null);
    setError(null);
  };

  const burnSubtitle = async () => {
    if (!videoFile) {
      alert("비디오 파일을 선택해주세요.");
      return;
    }

    if (!srtFile) {
      alert("자막 파일을 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultVideo(null);

    try {
      const formData = new FormData();
      formData.append("videoFile", videoFile);
      formData.append("srtFile", srtFile);

      const response = await axios.post(API_ROUTES.SUBTITLE_BURN, formData, {
        responseType: "blob",
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const url = URL.createObjectURL(response.data);
      setResultVideo(url);
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.error || "자막 합성 중 오류가 발생했습니다.",
        );
      } else {
        setError("자막 합성 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadVideo = async () => {
    if (!resultVideo) return;

    const fileName = videoFile
      ? `${videoFile.name.substring(0, videoFile.name.lastIndexOf("."))}_subtitled.mp4`
      : "video_subtitled.mp4";

    await downloadFileFromUrl(resultVideo, fileName, {
      description: "MP4 Video",
      accept: {
        "video/mp4": [".mp4"],
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          자막 합성기
        </h1>
        <p className="text-slate-300">
          비디오 파일에 자막(.srt)을 합성하여 새로운 비디오를 생성합니다.
        </p>
      </div>

      <div className="space-y-6">
        {/* 파일 업로드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">
              비디오 파일
            </h2>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600"
            />
            {videoFile && (
              <p className="mt-2 text-sm text-slate-400">
                {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)}{" "}
                MB)
              </p>
            )}
          </div>

          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">
              자막 파일 (.srt)
            </h2>
            <input
              ref={srtInputRef}
              type="file"
              accept=".srt"
              onChange={handleSrtChange}
              className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600"
            />
            {srtFile && (
              <p className="mt-2 text-sm text-slate-400">
                {srtFile.name} ({(srtFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
        </div>

        {/* 비디오 미리보기 */}
        {videoPreview && (
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">
              원본 비디오 미리보기
            </h2>
            <video
              src={videoPreview}
              controls
              className="w-full rounded-lg max-h-96"
            />
          </div>
        )}

        {/* 합성 버튼 */}
        <button
          onClick={burnSubtitle}
          disabled={!videoFile || !srtFile || isLoading}
          className="w-full px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading
            ? "자막 합성 중... (시간이 걸릴 수 있습니다)"
            : "자막 합성하기"}
        </button>

        {/* 오류 메시지 */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
            <p className="font-semibold">오류</p>
            <p>{error}</p>
          </div>
        )}

        {/* 결과 비디오 */}
        {resultVideo && (
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-200">
                합성된 비디오
              </h2>
              <button
                onClick={downloadVideo}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm transition-colors"
              >
                다운로드
              </button>
            </div>
            <video
              src={resultVideo}
              controls
              className="w-full rounded-lg max-h-96"
            />
          </div>
        )}
      </div>
    </div>
  );
}
