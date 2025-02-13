interface SubmitButtonProps {
  loading: boolean;
  selectedFile: File | null;
  selectedBackgroundColor: string | null;
  textOptions: {
    textMode: "single" | "multiple";
    title?: string;
    content?: string;
    bottom?: string;
  };
  multipleTextMode: "ui" | "json";
  textInputs: Array<{ title?: string; content?: string; bottom?: string }>;
  jsonInput: string;
}

export default function SubmitButton({
  loading,
  selectedFile,
  selectedBackgroundColor,
  textOptions,
  multipleTextMode,
  textInputs,
  jsonInput,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={
        loading ||
        (!selectedFile && !selectedBackgroundColor) ||
        (textOptions.textMode === "single"
          ? !textOptions.title?.trim() &&
            !textOptions.content?.trim() &&
            !textOptions.bottom?.trim()
          : multipleTextMode === "ui"
          ? textInputs.every(
              (input) =>
                !input.title?.trim() &&
                !input.content?.trim() &&
                !input.bottom?.trim()
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
  );
}
