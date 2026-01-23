"use client";

import { API_ROUTES } from "@/constants/routes";
import axios from "axios";
import { useState } from "react";

interface DownloadResult {
  success: boolean;
  filePath: string;
  fileName: string;
  fileSize: number;
  parts?: Array<{ path: string; name: string; size: number }>;
}

export default function YouTubeDownloaderPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [numParts, setNumParts] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const response = await axios.get(API_ROUTES.FILES, {
        params: { path: filePath },
        responseType: "blob",
      });

      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("파일 다운로드 오류:", error);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  const handleDownload = async () => {
    if (!youtubeUrl.trim()) {
      alert("YouTube URL을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDownloadResult(null);

    try {
      const formData = new FormData();
      formData.append("youtubeUrl", youtubeUrl.trim());
      formData.append("numParts", numParts.toString());

      const response = await axios.post<DownloadResult>(
        "/api/v1/youtube/download",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setDownloadResult(response.data);
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.error ||
            "다운로드 중 오류가 발생했습니다."
        );
      } else {
        setError("다운로드 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          YouTube 다운로더
        </h1>
        <p className="text-slate-300 mb-2">
          YouTube 동영상을 최고 화질로 다운로드하고, 필요시 여러 파일로
          분할할 수 있습니다.
        </p>
        <div className="p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm">
          <p className="font-semibold mb-1">⚠️ 저작권 경고</p>
          <p>
            타인의 저작물을 허락 없이 다운로드하여 재배포하는 것은 저작권법에
            위배될 수 있습니다. 법적으로 허용된 범위 내에서만 사용해주세요.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 입력 폼 */}
        <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">
            다운로드 설정
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                YouTube URL
              </label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                분할 개수 (선택)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={numParts}
                onChange={(e) => setNumParts(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <p className="mt-1 text-xs text-slate-400">
                1로 설정하면 분할하지 않습니다. 2 이상으로 설정하면 동영상을
                해당 개수로 분할합니다.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={!youtubeUrl.trim() || isLoading}
            className="w-full mt-6 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "다운로드 중... (시간이 걸릴 수 있습니다)" : "다운로드 시작"}
          </button>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
            <p className="font-semibold">오류</p>
            <p>{error}</p>
          </div>
        )}

        {/* 다운로드 결과 */}
        {downloadResult && (
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">
              다운로드 완료
            </h2>

            <div className="space-y-4">
              {/* 원본 파일 */}
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-200">
                      {downloadResult.fileName}
                    </p>
                    <p className="text-sm text-slate-400">
                      {formatFileSize(downloadResult.fileSize)}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      downloadFile(
                        downloadResult.filePath,
                        downloadResult.fileName
                      )
                    }
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm transition-colors"
                  >
                    다운로드
                  </button>
                </div>
              </div>

              {/* 분할된 파일들 */}
              {downloadResult.parts && downloadResult.parts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-3">
                    분할된 파일들
                  </h3>
                  <div className="space-y-2">
                    {downloadResult.parts.map((part, index) => (
                      <div
                        key={index}
                        className="p-4 bg-slate-900/50 rounded-lg"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-200">
                              {part.name}
                            </p>
                            <p className="text-sm text-slate-400">
                              {formatFileSize(part.size)}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              downloadFile(part.path, part.name)
                            }
                            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm transition-colors"
                          >
                            다운로드
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
