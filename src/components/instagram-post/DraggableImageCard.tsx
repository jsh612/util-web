"use client";

import { ImageTextOptions } from "@/types/api.types";
import Image from "next/image";
import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";

interface TextResult {
  id: string;
  preview: string;
  textOptions: ImageTextOptions;
}

const ItemTypes = {
  CARD: "card",
};

interface DragItem {
  id: string;
  index: number;
}

interface DraggableImageCardProps {
  result: TextResult;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  handleDownload: (result: TextResult, index: number) => void;
  handleRemoveResult: (id: string) => void;
}

export default function DraggableImageCard({
  result,
  index,
  moveCard,
  handleDownload,
  handleRemoveResult,
}: DraggableImageCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<
    DragItem,
    void,
    { handlerId: string | symbol | null }
  >({
    accept: ItemTypes.CARD,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag<
    DragItem,
    void,
    { isDragging: boolean }
  >({
    type: ItemTypes.CARD,
    item: () => {
      return { id: result.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      className={`p-4 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg cursor-move transition-opacity duration-200 ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-teal-400">
            #{index + 1}
          </span>
          <span className="text-lg font-medium text-slate-300">
            {result.textOptions.title || ""}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDownload(result, index)}
            className="p-2 text-teal-400 hover:text-teal-300 transition-colors"
            title="다운로드"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
          <button
            onClick={() => handleRemoveResult(result.id)}
            className="p-2 text-red-400 hover:text-red-300 transition-colors"
            title="삭제"
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
      </div>
      <div className="rounded-lg overflow-hidden relative h-[300px] w-full">
        <Image
          src={result.preview}
          alt={result.textOptions.content || ""}
          fill
          className={`object-contain transition-opacity duration-200 ${
            isDragging ? "opacity-40" : "opacity-100"
          }`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    </div>
  );
}
