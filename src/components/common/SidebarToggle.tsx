"use client";

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  direction?: "left" | "right";
  position?: "inside" | "outside";
  label?: {
    open: string;
    close: string;
  };
  className?: string;
}

export default function SidebarToggle({
  isOpen,
  onToggle,
  direction = "left",
  position = "inside",
  label = {
    open: "사이드바 열기",
    close: "사이드바 닫기",
  },
  className = "",
}: SidebarToggleProps) {
  // 외부 버튼 스타일 (사이드바가 닫혔을 때)
  if (position === "outside") {
    return (
      <button
        onClick={onToggle}
        className={`absolute left-0 top-4 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-r-lg border-r border-y border-slate-700/50 transition-all duration-300 ease-in-out z-10 ${className}`}
        title={label.open}
      >
        <svg
          className="w-5 h-5 text-slate-300 transition-transform duration-300 ease-in-out"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    );
  }

  // 내부 버튼 스타일 (사이드바 안에 있는 버튼)
  // 사이드바가 열려있을 때: 왼쪽 화살표 (닫기), 닫혀있을 때: 오른쪽 화살표 (열기)
  const rotationClass =
    direction === "left"
      ? isOpen
        ? "rotate-180"
        : ""
      : isOpen
        ? ""
        : "rotate-180";

  return (
    <button
      onClick={onToggle}
      className={`p-2 hover:bg-slate-700 rounded-lg transition-colors ${className}`}
      title={isOpen ? label.close : label.open}
    >
      <svg
        className={`w-5 h-5 text-slate-300 transition-transform duration-300 ease-in-out ${rotationClass}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
}
