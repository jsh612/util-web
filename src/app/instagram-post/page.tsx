"use client";

import ImageUploadSection from "@/components/instagram-post/ImageUploadSection";
import {
  ColorModal,
  DefaultImageModal,
} from "@/components/instagram-post/Modals";
import ResetButton from "@/components/instagram-post/ResetButton";
import ResultsSection from "@/components/instagram-post/ResultsSection";
import StyleOptionsSection from "@/components/instagram-post/StyleOptionsSection";
import SubmitButton from "@/components/instagram-post/SubmitButton";
import TextInputSection from "@/components/instagram-post/TextInputSection";
import MainLayout from "@/components/layout/MainLayout";
import { API_ROUTES } from "@/constants/routes";
import { ImageTextOptions } from "@/types/api.types";
import { TextResult } from "@/types/instagram-post.types";
import JSZip from "jszip";
import { useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const BACKGROUND_COLORS = [
  // 밝은 색상
  "#FFFFFF", // 흰색
  "#ECE5C7", // 크림색
  "#FFEEAD", // 베이지색

  // 파스텔
  "#E3F2FD", // 페이퍼 블루
  "#F3E5F5", // 페이퍼 퍼플
  "#E8F5E9", // 페이퍼 그린

  // 선명한 색상
  "#FF6B6B", // 빨간색
  "#4ECDC4", // 청록색
  "#45B7D1", // 하늘색
  "#00B4D8", // 밝은 하늘색
  "#48CAE4", // 연한 하늘색
  "#40916C", // 진한 초록색
  "#95D5B2", // 연한 초록색

  // 중간 톤
  "#576F72", // 차분한 그레이
  "#7F8C8D", // 중간 그레이

  // 어두운 색상
  "#1B264F", // 딥 네이비
  "#000000", // 검정색
] as const;

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

  const [textOptions, setTextOptions] = useState<ImageTextOptions>({
    textMode: "single",
    title: "",
    content: "",
    bottom: "",
    textArray: [],
    titleFontSize: 64,
    textFontSize: 48,
    bottomFontSize: 32,
    titleColor: "#ffffff",
    textColor: "#ffffff",
    bottomColor: "#ffffff",
    fontFamily: "Cafe24Ssurround",
    instagramRatio: "square",
  });

  const [textInputs, setTextInputs] = useState<
    Array<{ title?: string; content?: string; bottom?: string }>
  >([{ title: "", content: "", bottom: "" }]);

  const [multipleTextMode, setMultipleTextMode] = useState<"ui" | "json">("ui");
  const [jsonInput, setJsonInput] = useState<string>(
    '[\n  {\n    "title": "제목 (선택)",\n    "content": "본문 (선택)",\n    "bottom": "하단 텍스트 (선택)"\n  }\n]'
  );

  const [jsonError, setJsonError] = useState<string | null>(null);

  const validateAndParseJson = (): Array<{
    title?: string;
    content?: string;
    bottom?: string;
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
            (!("title" in item) || typeof item.title === "string") &&
            (!("content" in item) || typeof item.content === "string") &&
            (!("bottom" in item) || typeof item.bottom === "string")
        )
      ) {
        throw new Error(
          "각 항목의 title, content, bottom은 모두 선택사항이며 문자열이어야 합니다."
        );
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
      !textOptions.content?.trim()
    ) {
      setError("제목 또는 본문을 입력해주세요.");
      return;
    }

    if (
      textOptions.textMode === "multiple" &&
      multipleTextMode === "ui" &&
      textInputs.every(
        (input) =>
          !input.title?.trim() &&
          !input.content?.trim() &&
          !input.bottom?.trim()
      )
    ) {
      setError("최소 하나의 텍스트 세트에 텍스트를 입력해주세요.");
      return;
    }

    if (textOptions.textMode === "multiple") {
      if (multipleTextMode === "json") {
        const parsedJson = validateAndParseJson();
        if (!parsedJson) return;
        if (
          parsedJson.every(
            (item) =>
              !item.title?.trim() &&
              !item.content?.trim() &&
              !item.bottom?.trim()
          )
        ) {
          setError("최소 하나의 텍스트 세트에 텍스트를 입력해주세요.");
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
          (textInput) =>
            textInput.title?.trim() ||
            textInput.content?.trim() ||
            textInput.bottom?.trim()
        );

        for (const textInput of validTextInputs) {
          const finalTextOptions: ImageTextOptions = {
            ...textOptions,
            textMode: "single" as const,
            title: textInput.title?.replace(/\\n/g, "\n") || "",
            content: textInput.content?.replace(/\\n/g, "\n") || "",
            bottom: textInput.bottom?.replace(/\\n/g, "\n") || "",
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
      } else {
        const finalTextOptions: ImageTextOptions = {
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
          content: "",
          bottom: "",
        }));
      } else {
        if (multipleTextMode === "ui") {
          setTextInputs([{ title: "", content: "", bottom: "" }]);
        } else {
          setJsonInput(
            '[\n  {\n    "title": "제목 (선택)",\n    "content": "본문 (선택)",\n    "bottom": "하단 텍스트 (선택)"\n  }\n]'
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

  const resetTextInputs = () => {
    if (textOptions.textMode === "single") {
      setTextOptions((prev) => ({
        ...prev,
        title: "",
        content: "",
        bottom: "",
      }));
    } else {
      setTextInputs([{ title: "", content: "", bottom: "" }]);
      setJsonInput(
        '[\n  {\n    "title": "제목 (선택)",\n    "content": "본문 (선택)",\n    "bottom": "하단 텍스트 (선택)"\n  }\n]'
      );
      setJsonError(null);
    }
  };

  const resetStyleOptions = () => {
    setTextOptions((prev) => ({
      ...prev,
      fontFamily: "Cafe24Ssurround",
      titleFontSize: 64,
      textFontSize: 48,
      bottomFontSize: 32,
      titleColor: "#ffffff",
      textColor: "#ffffff",
      bottomColor: "#ffffff",
      instagramRatio: "square",
    }));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <MainLayout>
        <div className="container max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-teal-400 mb-8">
            인스타그램 포스트 에디터
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
                {error}
              </div>
            )}
            <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg space-y-6">
              <ImageUploadSection
                selectedFile={selectedFile}
                selectedBackgroundColor={selectedBackgroundColor}
                previewImage={previewImage}
                hasDefaultImage={hasDefaultImage}
                handleImageUpload={handleImageUpload}
                handleDefaultImageSelect={handleDefaultImageSelect}
                handleDefaultImageChange={handleDefaultImageChange}
                handleDefaultImageDelete={handleDefaultImageDelete}
                handleRemoveFile={handleRemoveFile}
                setIsDefaultImageModalOpen={setIsDefaultImageModalOpen}
                setIsColorModalOpen={setIsColorModalOpen}
                setSelectedBackgroundColor={setSelectedBackgroundColor}
              />
            </div>

            <DefaultImageModal
              isOpen={isDefaultImageModalOpen}
              onClose={() => setIsDefaultImageModalOpen(false)}
              onUploadSuccess={handleDefaultImageSelect}
              setError={setError}
              setHasDefaultImage={setHasDefaultImage}
            />

            <ColorModal
              isOpen={isColorModalOpen}
              onClose={() => setIsColorModalOpen(false)}
              onColorSelect={handleColorSelect}
              backgroundColors={Array.from(BACKGROUND_COLORS)}
            />

            <div className="mb-8 p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-200">
                  텍스트 입력
                </h2>
                <ResetButton onClick={resetTextInputs} label="텍스트 초기화" />
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
            </div>

            <div className="mb-8 p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-200">
                  텍스트 스타일
                </h2>
                <ResetButton
                  onClick={resetStyleOptions}
                  label="스타일 초기화"
                />
              </div>
              <StyleOptionsSection
                textOptions={textOptions}
                setTextOptions={setTextOptions}
              />
            </div>

            <div className="flex justify-center mt-6">
              <SubmitButton
                loading={loading}
                selectedFile={selectedFile}
                selectedBackgroundColor={selectedBackgroundColor}
                textOptions={textOptions}
                multipleTextMode={multipleTextMode}
                textInputs={textInputs}
                jsonInput={jsonInput}
              />
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
