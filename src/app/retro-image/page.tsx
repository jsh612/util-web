"use client";

import MainLayout from "@/components/layout/MainLayout";
import { API_ROUTES } from "@/constants/routes";
import axios from "axios";
import Image from "next/image";
import { ChangeEvent, useRef, useState } from "react";

export default function RetroImagePage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quality, setQuality] = useState(15);
  const [addNoise, setAddNoise] = useState(true);
  const [level, setLevel] = useState("medium");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 미리보기
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setOriginalImage(reader.result);
        setProcessedImage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      alert("이미지를 선택해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("imageFile", fileInputRef.current.files[0]);
      formData.append("quality", quality.toString());
      formData.append("addNoise", addNoise.toString());
      formData.append("level", level);

      const response = await axios.post(API_ROUTES.RETRO_IMAGE, formData, {
        responseType: "blob",
      });

      if (!response.data) {
        throw new Error("이미지 처리 중 오류가 발생했습니다.");
      }

      const url = URL.createObjectURL(response.data);
      setProcessedImage(url);
    } catch (error) {
      console.error(error);
      alert("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;

    // 다운로드 링크 생성
    const a = document.createElement("a");
    a.href = processedImage;
    a.download = "retro-image.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 초기화 함수 추가
  const resetSettings = () => {
    setQuality(15);
    setAddNoise(true);
    setLevel("medium");

    // 이미지 상태는 유지할지 초기화할지 선택
    if (processedImage) {
      setProcessedImage(null);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-extrabold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          2009년 화질 변환기
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-200">설정</h2>
                <button
                  onClick={resetSettings}
                  className="px-3 py-1 bg-slate-600/70 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-all duration-300 flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  초기화
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-500/20 file:text-teal-400 hover:file:bg-teal-500/30 transition-all duration-300"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="quality"
                    className="block text-sm font-medium text-slate-300 mb-1"
                  >
                    화질 (낮을수록 더 저화질) - {quality}%
                  </label>
                  <input
                    id="quality"
                    type="range"
                    min={1}
                    max={50}
                    step={1}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="noise"
                    type="checkbox"
                    checked={addNoise}
                    onChange={(e) => setAddNoise(e.target.checked)}
                    className="w-4 h-4 accent-teal-500 bg-slate-800/50 border-slate-600/50 rounded"
                  />
                  <label
                    htmlFor="noise"
                    className="text-sm font-medium text-slate-300"
                  >
                    노이즈 추가
                  </label>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="level"
                    className="block text-sm font-medium text-slate-300 mb-1"
                  >
                    저화질 레벨
                  </label>
                  <select
                    id="level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  >
                    <option value="low">약함 (640x480)</option>
                    <option value="medium">중간 (480x360)</option>
                    <option value="high">강함 (320x240)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={processImage}
                    disabled={!originalImage || isLoading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl hover:from-teal-600 hover:to-blue-600 transition-all duration-300 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? "처리 중..." : "2009년 화질로 변환"}
                  </button>

                  {processedImage && (
                    <button
                      onClick={downloadImage}
                      className="w-full px-6 py-3 bg-slate-700/70 text-teal-400 rounded-xl hover:bg-slate-700/90 transition-all duration-300 font-medium"
                    >
                      다운로드
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="text-sm text-slate-400 space-y-2 p-4 bg-slate-700/30 rounded-xl border border-slate-700/50">
              <p>
                📸 <strong>2009년 화질 변환기</strong>는 현대 디지털 이미지를
                당시의 저화질 스타일로 변환합니다.
              </p>
              <p>
                🎮 추억의 MSN/싸이월드 시절 이미지 느낌을 재현할 수 있습니다.
              </p>
              <p>
                ⚙️ 화질, 노이즈, 저화질 레벨을 조절하여 원하는 스타일을
                만들어보세요.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {originalImage && (
                <div className="p-4 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg">
                  <h3 className="text-lg font-medium mb-2 text-slate-200">
                    원본 이미지
                  </h3>
                  <div className="overflow-hidden rounded-md">
                    <Image
                      src={originalImage}
                      alt="원본"
                      className="w-full h-auto object-contain"
                      width={800}
                      height={600}
                      unoptimized
                    />
                  </div>
                </div>
              )}

              {processedImage && (
                <div className="p-4 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg">
                  <h3 className="text-lg font-medium mb-2 text-slate-200">
                    변환된 이미지
                  </h3>
                  <div className="overflow-hidden rounded-md">
                    <Image
                      src={processedImage}
                      alt="변환됨"
                      className="w-full h-auto object-contain"
                      width={800}
                      height={600}
                      unoptimized
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
