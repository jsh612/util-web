"use client";

import { ImageTextOptions } from "@/types/api.types";
import { useEffect, useRef, useState } from "react";

interface StyleOptionsSectionProps {
  textOptions: ImageTextOptions;
  setTextOptions: (options: ImageTextOptions) => void;
}

const FONT_FAMILIES = [
  { value: "Pretendard", label: "프리텐다드", family: "Pretendard" },
  {
    value: "Noto Sans KR",
    label: "노토 산스",
    family: "var(--font-noto-sans)",
  },
  {
    value: "Nanum Gothic",
    label: "나눔고딕",
    family: "var(--font-nanum-gothic)",
  },
  {
    value: "Nanum Myeongjo",
    label: "나눔명조",
    family: "var(--font-nanum-myeongjo)",
  },
  { value: "NanumPen", label: "나눔손글씨 펜", family: "NanumPen" },
  { value: "NanumBrush", label: "나눔손글씨 붓", family: "NanumBrush" },
  {
    value: "Spoqa Han Sans Neo",
    label: "스포카 한 산스",
    family: "Spoqa Han Sans Neo",
  },
  {
    value: "Wanted Sans Variable",
    label: "원티드 산스",
    family: "Wanted Sans Variable",
  },
  {
    value: "Cafe24Ssurround",
    label: "카페24 써라운드",
    family: "Cafe24Ssurround",
  },
  {
    value: "Cafe24SsurroundAir",
    label: "카페24 써라운드 에어",
    family: "Cafe24SsurroundAir",
  },
  {
    value: "Cafe24Ohsquare",
    label: "카페24 아네모네",
    family: "Cafe24Ohsquare",
  },
  {
    value: "Cafe24Simplehae",
    label: "카페24 심플해",
    family: "Cafe24Simplehae",
  },
  {
    value: "Cafe24Dangdanghae",
    label: "카페24 당당해",
    family: "Cafe24Dangdanghae",
  },
  {
    value: "Cafe24Syongsyong",
    label: "카페24 숑숑",
    family: "Cafe24Syongsyong",
  },
] as const;

export default function StyleOptionsSection({
  textOptions,
  setTextOptions,
}: StyleOptionsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const titleColorInputRef = useRef<HTMLInputElement>(null);
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const bottomColorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleTitleColorClick = () => {
    titleColorInputRef.current?.click();
  };

  const handleTextColorClick = () => {
    textColorInputRef.current?.click();
  };

  const handleBottomColorClick = () => {
    bottomColorInputRef.current?.click();
  };

  return (
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
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-slate-400 mb-2 block">
              자주 사용
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                "#FFFFFF",
                "#000000",
                "#333333",
                "#666666",
                "#2C3E50",
                "#E74C3C",
                "#3498DB",
                "#27AE60",
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    setTextOptions({
                      ...textOptions,
                      titleColor: color,
                    })
                  }
                  className={`w-12 h-12 rounded-lg transition-all duration-200 ${
                    textOptions.titleColor === color
                      ? "ring-2 ring-teal-400 scale-110"
                      : "ring-1 ring-slate-600/50 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div className="relative">
            <input
              ref={titleColorInputRef}
              type="color"
              value={textOptions.titleColor}
              onChange={(e) =>
                setTextOptions({
                  ...textOptions,
                  titleColor: e.target.value,
                })
              }
              className="sr-only"
            />
            <button
              type="button"
              onClick={handleTitleColorClick}
              className="w-full h-12 px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 flex items-center"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-6 h-6 rounded-md border border-slate-600/50"
                  style={{ backgroundColor: textOptions.titleColor }}
                />
                <span className="text-slate-300">{textOptions.titleColor}</span>
              </div>
              <div className="flex-1" />
              <span className="text-sm text-slate-400 ml-4">색상 선택</span>
            </button>
          </div>
        </div>
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
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-slate-400 mb-2 block">
              자주 사용
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                "#FFFFFF",
                "#000000",
                "#333333",
                "#666666",
                "#2C3E50",
                "#E74C3C",
                "#3498DB",
                "#27AE60",
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    setTextOptions({
                      ...textOptions,
                      textColor: color,
                    })
                  }
                  className={`w-12 h-12 rounded-lg transition-all duration-200 ${
                    textOptions.textColor === color
                      ? "ring-2 ring-teal-400 scale-110"
                      : "ring-1 ring-slate-600/50 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div className="relative">
            <input
              ref={textColorInputRef}
              type="color"
              value={textOptions.textColor}
              onChange={(e) =>
                setTextOptions({
                  ...textOptions,
                  textColor: e.target.value,
                })
              }
              className="sr-only"
            />
            <button
              type="button"
              onClick={handleTextColorClick}
              className="w-full h-12 px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 flex items-center"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-6 h-6 rounded-md border border-slate-600/50"
                  style={{ backgroundColor: textOptions.textColor }}
                />
                <span className="text-slate-300">{textOptions.textColor}</span>
              </div>
              <div className="flex-1" />
              <span className="text-sm text-slate-400 ml-4">색상 선택</span>
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          하단 텍스트 글자 크기
        </label>
        <input
          type="number"
          value={textOptions.bottomFontSize}
          onChange={(e) =>
            setTextOptions({
              ...textOptions,
              bottomFontSize: Number(e.target.value),
            })
          }
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          하단 텍스트 글자 색상
        </label>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-slate-400 mb-2 block">
              자주 사용
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                "#FFFFFF",
                "#000000",
                "#333333",
                "#666666",
                "#2C3E50",
                "#E74C3C",
                "#3498DB",
                "#27AE60",
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    setTextOptions({
                      ...textOptions,
                      bottomColor: color,
                    })
                  }
                  className={`w-12 h-12 rounded-lg transition-all duration-200 ${
                    textOptions.bottomColor === color
                      ? "ring-2 ring-teal-400 scale-110"
                      : "ring-1 ring-slate-600/50 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div className="relative">
            <input
              ref={bottomColorInputRef}
              type="color"
              value={textOptions.bottomColor}
              onChange={(e) =>
                setTextOptions({
                  ...textOptions,
                  bottomColor: e.target.value,
                })
              }
              className="sr-only"
            />
            <button
              type="button"
              onClick={handleBottomColorClick}
              className="w-full h-12 px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 flex items-center"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-6 h-6 rounded-md border border-slate-600/50"
                  style={{ backgroundColor: textOptions.bottomColor }}
                />
                <span className="text-slate-300">
                  {textOptions.bottomColor}
                </span>
              </div>
              <div className="flex-1" />
              <span className="text-sm text-slate-400 ml-4">색상 선택</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            폰트
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center justify-between"
              style={{
                fontFamily: FONT_FAMILIES.find(
                  (f) => f.value === textOptions.fontFamily
                )?.family,
              }}
            >
              <span>
                {FONT_FAMILIES.find((f) => f.value === textOptions.fontFamily)
                  ?.label || "폰트 선택"}
              </span>
              <svg
                className={`w-5 h-5 transition-transform ${
                  isOpen ? "transform rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isOpen && (
              <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                {FONT_FAMILIES.map((font) => (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => {
                      setTextOptions({
                        ...textOptions,
                        fontFamily: font.value,
                      });
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-slate-600/50 ${
                      textOptions.fontFamily === font.value
                        ? "bg-slate-600"
                        : ""
                    }`}
                    style={{ fontFamily: font.family }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
