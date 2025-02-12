"use client";

import MainLayout from "@/components/layout/MainLayout";
import { ImageTextOptions } from "@/types/api.types";
import JSZip from "jszip";
import Image from "next/image";
import { useRef, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

interface TextResult {
  id: string;
  preview: string;
  textOptions: ImageTextOptions;
}

const ItemTypes = {
  CARD: "card",
};

interface DragItem {
  id: string;
  index: number;
}

interface DraggableImageCardProps {
  result: TextResult;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  handleDownload: (result: TextResult, index: number) => void;
  handleRemoveResult: (id: string) => void;
}

const DraggableImageCard = ({
  result,
  index,
  moveCard,
  handleDownload,
  handleRemoveResult,
}: DraggableImageCardProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<
    DragItem,
    void,
    { handlerId: string | symbol | null }
  >({
    accept: ItemTypes.CARD,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag<
    DragItem,
    void,
    { isDragging: boolean }
  >({
    type: ItemTypes.CARD,
    item: () => {
      return { id: result.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      className={`p-4 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg cursor-move transition-opacity duration-200 ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-teal-400">
            #{index + 1}
          </span>
          <span className="text-lg font-medium text-slate-300">
            {result.textOptions.text}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDownload(result, index)}
            className="p-2 text-teal-400 hover:text-teal-300 transition-colors"
            title="다운로드"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
          <button
            onClick={() => handleRemoveResult(result.id)}
            className="p-2 text-red-400 hover:text-red-300 transition-colors"
            title="삭제"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="rounded-lg overflow-hidden relative h-[300px] w-full">
        <Image
          src={result.preview}
          alt={result.textOptions.text}
          fill
          className={`object-contain transition-opacity duration-200 ${
            isDragging ? "opacity-40" : "opacity-100"
          }`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    </div>
  );
};

export default function InstagramPost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<TextResult[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [textOptions, setTextOptions] = useState<ImageTextOptions>({
    title: "",
    text: "",
    titleFontSize: 64,
    textFontSize: 48,
    titleColor: "#ffffff",
    textColor: "#ffffff",
    fontFamily: "Arial",
    instagramRatio: "square",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResults([]);
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
      setPreviewImage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) {
      setError("이미지를 선택해주세요.");
      return;
    }
    if (!textOptions.title?.trim() && !textOptions.text?.trim()) {
      setError("제목 또는 본문을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("imageFile", fileInputRef.current.files[0]);
      formData.append("textOptions", JSON.stringify(textOptions));

      const response = await fetch("/api/v1/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "이미지 처리 실패");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const newResult: TextResult = {
        id: Date.now().toString(),
        preview: url,
        textOptions: { ...textOptions },
      };
      setResults((prev) => [...prev, newResult]);

      setTextOptions((prev) => ({
        ...prev,
        title: "",
        text: "",
      }));

      // 이미지 로딩 완료 후 스크롤 실행
      const img = document.createElement("img");
      img.src = url;
      img.onload = () => {
        setTimeout(() => {
          const resultSection = document.querySelector(".results-section");
          if (resultSection) {
            resultSection.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      };
    } catch (error) {
      console.error("Error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "이미지 처리 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (result: TextResult, index: number) => {
    try {
      const response = await fetch(result.preview);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = selectedFile?.name
        ? selectedFile.name.split(".").pop()
        : "jpg";
      const today = new Date();
      const dateStr =
        today.getFullYear() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");
      a.download = `${dateStr}-instagram-post-${String(index + 1).padStart(
        2,
        "0"
      )}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      setError("이미지 다운로드 중 오류가 발생했습니다.");
    }
  };

  const handleBulkDownload = async () => {
    if (results.length === 0) return;

    setDownloadLoading(true);
    setError(null);

    try {
      const zip = new JSZip();
      const imageFolder = zip.folder("images");

      const today = new Date();
      const dateStr =
        today.getFullYear() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const response = await fetch(result.preview);
        const blob = await response.blob();
        const extension = selectedFile?.name
          ? selectedFile.name.split(".").pop()
          : "jpg";
        const fileName = `${dateStr}-instagram-post-${String(i + 1).padStart(
          2,
          "0"
        )}.${extension}`;
        imageFolder?.file(fileName, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "instagram-posts.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Bulk download error:", error);
      setError("일괄 다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleRemoveResult = (id: string) => {
    setResults((prev) => prev.filter((result) => result.id !== id));
  };

  const moveCard = (dragIndex: number, hoverIndex: number) => {
    setResults((prevResults) => {
      const newResults = [...prevResults];
      const [removed] = newResults.splice(dragIndex, 1);
      newResults.splice(hoverIndex, 0, removed);
      return newResults;
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <MainLayout>
        <div>
          <h1 className="text-4xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            인스타그램 포스트 에디터
          </h1>

          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    이미지 선택
                  </label>
                  <input
                    type="file"
                    id="file-upload"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="p-4 bg-slate-800/50 border border-slate-600/50 rounded-xl space-y-4">
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-700/50 border border-slate-600/50 hover:bg-slate-600/50 transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5 mr-2 text-teal-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <span className="text-sm font-medium text-teal-400">
                        {selectedFile ? "이미지 변경하기" : "이미지 추가하기"}
                      </span>
                    </label>
                    {selectedFile && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-700/50 rounded-lg">
                          <span className="text-sm text-slate-300">
                            {selectedFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                        {previewImage && (
                          <div className="relative w-full h-[300px] rounded-lg overflow-hidden">
                            <Image
                              src={previewImage}
                              alt="선택된 이미지 미리보기"
                              fill
                              className="object-contain"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    제목 (선택사항)
                  </label>
                  <textarea
                    value={textOptions.title}
                    onChange={(e) =>
                      setTextOptions({ ...textOptions, title: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400 resize-none"
                    placeholder="제목을 입력하세요 (선택사항)"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    본문 텍스트 (선택사항)
                  </label>
                  <textarea
                    value={textOptions.text}
                    onChange={(e) =>
                      setTextOptions({ ...textOptions, text: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white placeholder-slate-400 resize-none"
                    placeholder="본문 텍스트를 입력하세요 (선택사항)"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      인스타그램 비율
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setTextOptions({
                            ...textOptions,
                            instagramRatio: "square",
                          })
                        }
                        className={`px-4 py-2 rounded-lg border ${
                          textOptions.instagramRatio === "square"
                            ? "bg-teal-500 border-teal-400 text-white"
                            : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
                        }`}
                      >
                        정사각형 (1:1)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTextOptions({
                            ...textOptions,
                            instagramRatio: "portrait",
                          })
                        }
                        className={`px-4 py-2 rounded-lg border ${
                          textOptions.instagramRatio === "portrait"
                            ? "bg-teal-500 border-teal-400 text-white"
                            : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
                        }`}
                      >
                        세로형 (4:5)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTextOptions({
                            ...textOptions,
                            instagramRatio: "landscape",
                          })
                        }
                        className={`px-4 py-2 rounded-lg border ${
                          textOptions.instagramRatio === "landscape"
                            ? "bg-teal-500 border-teal-400 text-white"
                            : "bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
                        }`}
                      >
                        가로형 (1.91:1)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      제목 글자 크기
                    </label>
                    <input
                      type="number"
                      value={textOptions.titleFontSize}
                      onChange={(e) =>
                        setTextOptions({
                          ...textOptions,
                          titleFontSize: Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      제목 글자 색상
                    </label>
                    <input
                      type="color"
                      value={textOptions.titleColor}
                      onChange={(e) =>
                        setTextOptions({
                          ...textOptions,
                          titleColor: e.target.value,
                        })
                      }
                      className="w-full h-12 px-2 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      본문 글자 크기
                    </label>
                    <input
                      type="number"
                      value={textOptions.textFontSize}
                      onChange={(e) =>
                        setTextOptions({
                          ...textOptions,
                          textFontSize: Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      본문 글자 색상
                    </label>
                    <input
                      type="color"
                      value={textOptions.textColor}
                      onChange={(e) =>
                        setTextOptions({
                          ...textOptions,
                          textColor: e.target.value,
                        })
                      }
                      className="w-full h-12 px-2 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !selectedFile ||
                    (!textOptions.title?.trim() && !textOptions.text?.trim())
                  }
                  className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl hover:from-teal-600 hover:to-blue-600 transition-all duration-300 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      처리중...
                    </div>
                  ) : (
                    "텍스트 추가하기"
                  )}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-8 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
                {error}
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-8 space-y-6 results-section">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-teal-400">
                    생성된 이미지 목록
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setResults([])}
                      className="inline-flex items-center px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      전체 초기화
                    </button>
                    <button
                      onClick={handleBulkDownload}
                      disabled={downloadLoading}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg hover:from-teal-600 hover:to-blue-600 transition-all duration-300 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      {downloadLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                          다운로드 중...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          전체 다운로드
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results.map((result, index) => (
                    <DraggableImageCard
                      key={result.id}
                      result={result}
                      index={index}
                      moveCard={moveCard}
                      handleDownload={handleDownload}
                      handleRemoveResult={handleRemoveResult}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </DndProvider>
  );
}
