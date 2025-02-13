"use client";

import ResultsSection from "@/components/instagram-post/ResultsSection";
import StyleOptionsSection from "@/components/instagram-post/StyleOptionsSection";
import TextInputSection from "@/components/instagram-post/TextInputSection";
import MainLayout from "@/components/layout/MainLayout";
import { API_ROUTES } from "@/constants/routes";
import { ImageTextOptions } from "@/types/api.types";
import { TextResult } from "@/types/instagram-post.types";
import JSZip from "jszip";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export default function InstagramPost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState<
    string | null
  >(null);
  const [results, setResults] = useState<TextResult[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDefaultImageModalOpen, setIsDefaultImageModalOpen] = useState(false);
  const [hasDefaultImage, setHasDefaultImage] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const backgroundColors = [
    "#FF6B6B", // 빨간색
    "#4ECDC4", // 청록색
    "#45B7D1", // 하늘색
    "#96CEB4", // 민트색
    "#FFEEAD", // 베이지색
    "#000000", // 검정색
  ];

  const [textOptions, setTextOptions] = useState<ImageTextOptions>({
    textMode: "single",
    title: "",
    text: "",
    textArray: [],
    titleFontSize: 64,
    textFontSize: 48,
    titleColor: "#ffffff",
    textColor: "#ffffff",
    fontFamily: "Arial",
    instagramRatio: "square",
  });

  const [textInputs, setTextInputs] = useState<
    Array<{ title: string; content: string }>
  >([{ title: "", content: "" }]);

  const [multipleTextMode, setMultipleTextMode] = useState<"ui" | "json">("ui");
  const [jsonInput, setJsonInput] = useState<string>(
    '[\n  {\n    "title": "제목",\n    "content": "본문"\n  }\n]'
  );

  const [jsonError, setJsonError] = useState<string | null>(null);

  const validateAndParseJson = (): Array<{
    title: string;
    content: string;
  }> | null => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON은 배열 형식이어야 합니다.");
      }
      if (
        !parsed.every(
          (item) =>
            typeof item === "object" &&
            "title" in item &&
            "content" in item &&
            typeof item.title === "string" &&
            typeof item.content === "string"
        )
      ) {
        throw new Error("각 항목은 title과 content를 포함해야 합니다.");
      }
      return parsed;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "JSON 형식이 올바르지 않습니다."
      );
      return null;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResults([]);
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);
    }
  };

  const checkDefaultImage = async () => {
    try {
      const response = await fetch(API_ROUTES.INSTAGRAM_DEFAULT);
      setHasDefaultImage(response.ok);
    } catch {
      setHasDefaultImage(false);
    }
  };

  useEffect(() => {
    checkDefaultImage();
  }, []);

  const handleDefaultImageSelect = async () => {
    try {
      const response = await fetch(API_ROUTES.INSTAGRAM_DEFAULT);
      if (!response.ok) {
        if (response.status === 404) {
          setIsDefaultImageModalOpen(true);
          return;
        }
        throw new Error("기본 이미지를 불러오는데 실패했습니다.");
      }
      const blob = await response.blob();
      const file = new File([blob], "instagram-default.png", {
        type: "image/png",
      });
      setSelectedFile(file);
      setResults([]);
      const previewUrl = URL.createObjectURL(blob);
      setPreviewImage(previewUrl);
      setHasDefaultImage(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "기본 이미지를 불러오는데 실패했습니다."
      );
    }
  };

  const handleDefaultImageDelete = async () => {
    try {
      const response = await fetch(API_ROUTES.INSTAGRAM_DEFAULT, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("기본 이미지 삭제에 실패했습니다.");
      }
      setHasDefaultImage(false);
      if (selectedFile?.name === "instagram-default.png") {
        setSelectedFile(null);
        if (previewImage) {
          URL.revokeObjectURL(previewImage);
          setPreviewImage(null);
        }
        setResults([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
      setError(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "기본 이미지 삭제에 실패했습니다."
      );
    }
  };

  const handleDefaultImageChange = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(API_ROUTES.INSTAGRAM_DEFAULT, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("기본 이미지 변경에 실패했습니다.");
      }
      await checkDefaultImage();
      if (selectedFile?.name === "instagram-default.png") {
        await handleDefaultImageSelect();
      }
      setError(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "기본 이미지 변경에 실패했습니다."
      );
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

  const handleColorSelect = (color: string) => {
    setSelectedBackgroundColor(color);
    setSelectedFile(null);
    setResults([]);
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
      setPreviewImage(null);
    }
    setIsColorModalOpen(false);
  };

  const createBackgroundImageFile = async (color: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, "image/png");
      });

      return new File([blob], "background.png", { type: "image/png" });
    }
    throw new Error("배경 이미지 생성에 실패했습니다.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile && !selectedBackgroundColor) {
      setError("이미지를 선택하거나 배경색을 선택해주세요.");
      return;
    }

    if (
      textOptions.textMode === "single" &&
      !textOptions.title?.trim() &&
      !textOptions.text?.trim()
    ) {
      setError("제목 또는 본문을 입력해주세요.");
      return;
    }

    if (textOptions.textMode === "multiple") {
      if (
        multipleTextMode === "ui" &&
        textInputs.every(
          (input) => !input.title.trim() && !input.content.trim()
        )
      ) {
        setError("최소 하나의 텍스트 세트에 제목 또는 본문을 입력해주세요.");
        return;
      }
      if (multipleTextMode === "json") {
        const parsedJson = validateAndParseJson();
        if (!parsedJson) return;
        if (
          parsedJson.every((item) => !item.title.trim() && !item.content.trim())
        ) {
          setError("최소 하나의 텍스트 세트에 제목 또는 본문을 입력해주세요.");
          return;
        }
      }
    }

    setLoading(true);
    setError(null);

    try {
      let fileToUse = selectedFile;

      if (!fileToUse && selectedBackgroundColor) {
        fileToUse = await createBackgroundImageFile(selectedBackgroundColor);
      }

      if (!fileToUse) {
        throw new Error("이미지 생성에 실패했습니다.");
      }

      if (textOptions.textMode === "multiple") {
        let finalTextInputs = textInputs;

        if (multipleTextMode === "json") {
          const parsedJson = validateAndParseJson();
          if (!parsedJson) {
            setLoading(false);
            return;
          }
          finalTextInputs = parsedJson;
        }

        const validTextInputs = finalTextInputs.filter(
          (textInput) => textInput.title.trim() || textInput.content.trim()
        );

        for (const textInput of validTextInputs) {
          const finalTextOptions: ImageTextOptions = {
            textMode: "single",
            title: textInput.title,
            text: textInput.content || " ",
            titleFontSize: textOptions.titleFontSize,
            textFontSize: textOptions.textFontSize,
            titleColor: textOptions.titleColor,
            textColor: textOptions.textColor,
            fontFamily: textOptions.fontFamily,
            instagramRatio: textOptions.instagramRatio,
          };

          const formData = new FormData();
          formData.append("imageFile", fileToUse);
          formData.append("textOptions", JSON.stringify(finalTextOptions));

          const response = await fetch(API_ROUTES.IMAGE, {
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
            id: Date.now().toString() + Math.random(),
            preview: url,
            textOptions: { ...finalTextOptions },
          };
          setResults((prev) => [...prev, newResult]);
        }
      } else {
        const finalTextOptions = {
          ...textOptions,
          textArray: undefined,
        };

        const formData = new FormData();
        formData.append("imageFile", fileToUse);
        formData.append("textOptions", JSON.stringify(finalTextOptions));

        const response = await fetch(API_ROUTES.IMAGE, {
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
          textOptions: { ...finalTextOptions },
        };
        setResults((prev) => [...prev, newResult]);
      }

      if (textOptions.textMode === "single") {
        setTextOptions((prev) => ({
          ...prev,
          title: "",
          text: "",
        }));
      } else {
        if (multipleTextMode === "ui") {
          setTextInputs([{ title: "", content: "" }]);
        } else {
          setJsonInput(
            '[\n  {\n    "title": "제목",\n    "content": "본문"\n  }\n]'
          );
        }
      }

      setTimeout(() => {
        const resultSection = document.querySelector(".results-section");
        if (resultSection) {
          resultSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
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

  return (
    <DndProvider backend={HTML5Backend}>
      <MainLayout>
        <div className="container max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-teal-400 mb-8">
            인스타그램 이미지 생성기
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
                {error}
              </div>
            )}
            <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  이미지 선택
                </label>
                <div className="p-4 bg-slate-800/50 border border-slate-600/50 rounded-xl space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
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
                      <button
                        type="button"
                        onClick={() => {
                          if (hasDefaultImage) {
                            handleDefaultImageSelect();
                          } else {
                            setIsDefaultImageModalOpen(true);
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-700/50 border border-slate-600/50 hover:bg-slate-600/50 transition-colors"
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
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-teal-400">
                          {hasDefaultImage
                            ? "기본 이미지 사용"
                            : "기본 이미지 설정"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsColorModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-700/50 border border-slate-600/50 hover:bg-slate-600/50 transition-colors"
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
                            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                          />
                        </svg>
                        <span className="text-sm font-medium text-teal-400">
                          색상 배경 선택
                        </span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="file"
                    id="file-upload"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {(selectedFile || selectedBackgroundColor) && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-slate-300">
                            {selectedFile ? selectedFile.name : "배경색 이미지"}
                          </span>
                          {hasDefaultImage &&
                            selectedFile?.name === "instagram-default.png" && (
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input =
                                      document.createElement("input");
                                    input.type = "file";
                                    input.accept = "image/*";
                                    input.onchange = async (e) => {
                                      const file = (
                                        e.target as HTMLInputElement
                                      ).files?.[0];
                                      if (file) {
                                        await handleDefaultImageChange(file);
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-600/50 hover:bg-slate-500/50 transition-colors"
                                >
                                  <svg
                                    className="w-4 h-4 mr-1 text-teal-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                  </svg>
                                  <span className="text-sm text-teal-400">
                                    변경
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDefaultImageDelete}
                                  className="inline-flex items-center px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                                >
                                  <svg
                                    className="w-4 h-4 mr-1 text-red-400"
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
                                  <span className="text-sm text-red-400">
                                    제거
                                  </span>
                                </button>
                              </div>
                            )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedFile) {
                              handleRemoveFile();
                            } else {
                              setSelectedBackgroundColor(null);
                            }
                          }}
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
                      {(previewImage || selectedBackgroundColor) && (
                        <div className="relative w-[350px] h-[350px] mx-auto rounded-lg overflow-hidden">
                          {previewImage ? (
                            <Image
                              src={previewImage}
                              alt="선택된 이미지 미리보기"
                              fill
                              className="object-contain"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          ) : (
                            <div
                              className="w-full h-full"
                              style={{
                                backgroundColor:
                                  selectedBackgroundColor || undefined,
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 기본 이미지 업로드 모달 */}
              {isDefaultImageModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-slate-800 p-6 rounded-xl max-w-md w-full">
                    <h3 className="text-xl font-semibold text-teal-400 mb-4">
                      기본 이미지 없음
                    </h3>
                    <p className="text-slate-300 mb-6">
                      기본 이미지가 설정되어 있지 않습니다. 기본 이미지를
                      업로드하시겠습니까?
                    </p>
                    <div className="flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => setIsDefaultImageModalOpen(false)}
                        className="px-4 py-2 text-slate-400 hover:text-slate-300"
                      >
                        취소
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const response = await fetch(
                                API_ROUTES.INSTAGRAM_DEFAULT,
                                {
                                  method: "POST",
                                  body: formData,
                                }
                              );
                              if (!response.ok) {
                                throw new Error(
                                  "기본 이미지 업로드에 실패했습니다."
                                );
                              }
                              setIsDefaultImageModalOpen(false);
                              setHasDefaultImage(true);
                              await handleDefaultImageSelect();
                            } catch (error) {
                              setError(
                                error instanceof Error
                                  ? error.message
                                  : "기본 이미지 업로드에 실패했습니다."
                              );
                            }
                          }
                        }}
                        className="hidden"
                        id="default-image-upload"
                      />
                      <label
                        htmlFor="default-image-upload"
                        className="inline-flex items-center px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white transition-colors cursor-pointer"
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
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        이미지 업로드
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 배경 색상 선택 모달 */}
              {isColorModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-slate-800 p-6 rounded-xl max-w-md w-full">
                    <h3 className="text-xl font-semibold text-teal-400 mb-4">
                      배경 색상 선택
                    </h3>
                    <div className="grid grid-cols-5 gap-4 mb-6">
                      {backgroundColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorSelect(color)}
                          className="w-full aspect-square rounded-lg border-2 border-slate-600 hover:border-teal-400 transition-colors"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsColorModalOpen(false)}
                        className="px-4 py-2 text-slate-400 hover:text-slate-300"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <TextInputSection
              textOptions={textOptions}
              setTextOptions={setTextOptions}
              multipleTextMode={multipleTextMode}
              setMultipleTextMode={setMultipleTextMode}
              textInputs={textInputs}
              setTextInputs={setTextInputs}
              jsonInput={jsonInput}
              setJsonInput={setJsonInput}
              jsonError={jsonError}
              setJsonError={setJsonError}
            />

            <StyleOptionsSection
              textOptions={textOptions}
              setTextOptions={setTextOptions}
            />

            <div className="flex justify-center mt-6">
              <button
                type="submit"
                disabled={
                  loading ||
                  (!selectedFile && !selectedBackgroundColor) ||
                  (textOptions.textMode === "single"
                    ? !textOptions.title?.trim() && !textOptions.text?.trim()
                    : multipleTextMode === "ui"
                    ? textInputs.every(
                        (input) => !input.title.trim() && !input.content.trim()
                      )
                    : !jsonInput.trim())
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

          {results.length > 0 && (
            <ResultsSection
              results={results}
              setResults={setResults}
              downloadLoading={downloadLoading}
              handleBulkDownload={handleBulkDownload}
              handleDownload={handleDownload}
              handleRemoveResult={handleRemoveResult}
            />
          )}
        </div>
      </MainLayout>
    </DndProvider>
  );
}
