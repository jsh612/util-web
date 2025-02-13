import { API_ROUTES } from "@/constants/routes";

interface DefaultImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => Promise<void>;
  setError: (error: string) => void;
  setHasDefaultImage: (hasImage: boolean) => void;
}

interface ColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onColorSelect: (color: string) => void;
  backgroundColors: string[];
}

export function DefaultImageModal({
  isOpen,
  onClose,
  onUploadSuccess,
  setError,
  setHasDefaultImage,
}: DefaultImageModalProps) {
  if (!isOpen) return null;

  return (
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
            onClick={onClose}
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
                  const response = await fetch(API_ROUTES.INSTAGRAM_DEFAULT, {
                    method: "POST",
                    body: formData,
                  });
                  if (!response.ok) {
                    throw new Error("기본 이미지 업로드에 실패했습니다.");
                  }
                  onClose();
                  setHasDefaultImage(true);
                  await onUploadSuccess();
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
  );
}

export function ColorModal({
  isOpen,
  onClose,
  onColorSelect,
  backgroundColors,
}: ColorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-xl max-w-md w-full">
        <h3 className="text-xl font-semibold text-teal-400 mb-4">
          배경 색상 선택
        </h3>
        <div className="grid grid-cols-5 gap-4 mb-6">
          {backgroundColors.map((color) => (
            <button
              key={color}
              onClick={() => onColorSelect(color)}
              className="w-full aspect-square rounded-lg border-2 border-slate-600 hover:border-teal-400 transition-colors"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-slate-300"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
