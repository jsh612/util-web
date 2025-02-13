import Image from "next/image";
import { useRef } from "react";

interface ImageUploadSectionProps {
  selectedFile: File | null;
  selectedBackgroundColor: string | null;
  previewImage: string | null;
  hasDefaultImage: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDefaultImageSelect: () => void;
  handleDefaultImageChange: (file: File) => void;
  handleDefaultImageDelete: () => void;
  handleRemoveFile: () => void;
  setIsDefaultImageModalOpen: (isOpen: boolean) => void;
  setIsColorModalOpen: (isOpen: boolean) => void;
  setSelectedBackgroundColor: (color: string | null) => void;
}

export default function ImageUploadSection({
  selectedFile,
  selectedBackgroundColor,
  previewImage,
  hasDefaultImage,
  handleImageUpload,
  handleDefaultImageSelect,
  handleDefaultImageChange,
  handleDefaultImageDelete,
  handleRemoveFile,
  setIsDefaultImageModalOpen,
  setIsColorModalOpen,
  setSelectedBackgroundColor,
}: ImageUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
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
                {hasDefaultImage ? "기본 이미지 사용" : "기본 이미지 설정"}
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
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement)
                              .files?.[0];
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
                        <span className="text-sm text-teal-400">변경</span>
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
                        <span className="text-sm text-red-400">제거</span>
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
                      backgroundColor: selectedBackgroundColor || undefined,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
