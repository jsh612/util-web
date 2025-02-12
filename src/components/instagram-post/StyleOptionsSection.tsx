"use client";

import { ImageTextOptions } from "@/types/api.types";

interface StyleOptionsSectionProps {
  textOptions: ImageTextOptions;
  setTextOptions: (options: ImageTextOptions) => void;
}

export default function StyleOptionsSection({
  textOptions,
  setTextOptions,
}: StyleOptionsSectionProps) {
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
  );
}
