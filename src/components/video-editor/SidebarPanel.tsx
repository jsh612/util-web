"use client";

interface SidebarPanelProps {
  isOpen: boolean;
  children: React.ReactNode;
  position?: "left" | "right";
  width?: string;
}

export default function SidebarPanel({
  isOpen,
  children,
  position = "left",
  width = position === "left" ? "w-64" : "w-72",
}: SidebarPanelProps) {
  const borderClass =
    position === "left"
      ? "border-r border-slate-700/50"
      : "border-l border-slate-700/50";

  return (
    <div
      className={`${
        isOpen ? width : "w-0"
      } transition-all duration-300 ease-in-out ${borderClass} overflow-hidden bg-slate-800/30`}
    >
      <div
        className={`h-full overflow-y-auto ${
          isOpen ? "opacity-100" : "opacity-0"
        } transition-opacity duration-300`}
      >
        {children}
      </div>
    </div>
  );
}
