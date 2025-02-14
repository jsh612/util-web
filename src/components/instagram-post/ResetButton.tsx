interface ResetButtonProps {
  onClick: () => void;
  label?: string;
}

export default function ResetButton({
  onClick,
  label = "초기화",
}: ResetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 bg-slate-600/50 text-slate-200 rounded-lg hover:bg-slate-500/50 transition-colors"
    >
      {label}
    </button>
  );
}
