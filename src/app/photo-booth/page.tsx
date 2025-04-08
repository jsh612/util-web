"use client";

import MainLayout from "@/components/layout/MainLayout";
import { API_ROUTES } from "@/constants/routes";
import axios from "axios";
import Image from "next/image";
import { ChangeEvent, useRef, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// 사진과 미리보기 상태를 위한 인터페이스
interface ImageState {
  file: File | null;
  preview: string | null;
  id: number;
}

// 드래그 아이템 타입 정의
const ItemTypes = {
  IMAGE: "image",
};

// 드래그 가능한 이미지 컴포넌트
interface DraggableImageProps {
  image: ImageState;
  index: number;
  moveImage: (dragIndex: number, hoverIndex: number) => void;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const DraggableImage = ({
  image,
  index,
  moveImage,
  onImageChange,
}: DraggableImageProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // 드롭 로직
  const [, drop] = useDrop({
    accept: ItemTypes.IMAGE,
    hover(item: { index: number }) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // 같은 항목을 드래그하는 경우 처리하지 않음
      if (dragIndex === hoverIndex) {
        return;
      }

      moveImage(dragIndex, hoverIndex);
      // 드래그 중인 아이템의 인덱스를 변경
      item.index = hoverIndex;
    },
  });

  // 드래그 로직
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.IMAGE,
    item: () => {
      return { index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // 드래그와 드롭 ref를 연결
  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex flex-col items-center ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
      style={{ cursor: "move" }}
    >
      <div className="w-40 h-40 border border-slate-600 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative bg-slate-800/50">
        {image.preview ? (
          <Image
            src={image.preview}
            alt={`이미지 ${index + 1}`}
            fill
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className="text-slate-400 text-sm">{index + 1}번 이미지</span>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={onImageChange}
        className="w-full text-sm px-2 py-1 bg-slate-800/50 border border-slate-600 rounded-lg text-white file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-teal-500/20 file:text-teal-400 hover:file:bg-teal-500/30 transition-all duration-300"
      />
    </div>
  );
};

export default function PhotoBoothPage() {
  // 4개의 이미지 상태 관리 (각 이미지에 고유 ID 부여)
  const [images, setImages] = useState<ImageState[]>([
    { file: null, preview: null, id: 1 },
    { file: null, preview: null, id: 2 },
    { file: null, preview: null, id: 3 },
    { file: null, preview: null, id: 4 },
  ]);

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [borderColor, setBorderColor] = useState("#FFFFFF");
  const [gapColor, setGapColor] = useState("#FFFFFF");
  const [gapSize, setGapSize] = useState(20);
  const [borderSize, setBorderSize] = useState(40);
  const [layout, setLayout] = useState("portrait"); // 기본값: "portrait" (세로형)

  // 이미지 위치 변경 함수
  const moveImage = (dragIndex: number, hoverIndex: number) => {
    const draggedImage = images[dragIndex];
    const newImages = [...images];
    newImages.splice(dragIndex, 1);
    newImages.splice(hoverIndex, 0, draggedImage);
    setImages(newImages);
    setResultImage(null); // 순서가 변경되면 결과 초기화
  };

  // 이미지 업로드 처리
  const handleImageChange =
    (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 이미지 미리보기
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const newImages = [...images];
          newImages[index] = {
            ...newImages[index],
            file,
            preview: reader.result,
          };
          setImages(newImages);
          setResultImage(null); // 이미지가 변경되면 결과 초기화
        }
      };
      reader.readAsDataURL(file);
    };

  // 이미지 처리 요청
  const processImages = async () => {
    // 모든 이미지가 선택되었는지 확인
    if (images.some((img) => !img.file)) {
      alert("4개의 이미지를 모두 선택해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      images.forEach((img, i) => {
        if (img.file) {
          formData.append(`image${i + 1}`, img.file);
        }
      });

      // 설정값 추가
      formData.append("borderColor", borderColor);
      formData.append("gapColor", gapColor);
      formData.append("gapSize", gapSize.toString());
      formData.append("borderSize", borderSize.toString());
      formData.append("layout", layout);

      const response = await axios.post(API_ROUTES.PHOTO_BOOTH, formData, {
        responseType: "blob",
      });

      if (!response.data) {
        throw new Error("이미지 처리 중 오류가 발생했습니다.");
      }

      const url = URL.createObjectURL(response.data);
      setResultImage(url);
    } catch (error) {
      console.error(error);
      alert("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 결과 이미지 다운로드
  const downloadImage = () => {
    if (!resultImage) return;

    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "photo-booth-result.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 모든 설정 초기화
  const resetSettings = () => {
    setBorderColor("#FFFFFF");
    setGapColor("#FFFFFF");
    setGapSize(20);
    setBorderSize(40);
    setLayout("portrait");
  };

  // 이미지 입력 UI 렌더링
  const renderImageInputs = () => {
    return (
      <div className="grid grid-cols-2 gap-4 mb-6">
        {images.map((img, i) => (
          <DraggableImage
            key={img.id}
            image={img}
            index={i}
            moveImage={moveImage}
            onImageChange={handleImageChange(i)}
          />
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-extrabold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          포토부스 이미지 메이커
        </h1>

        <DndProvider backend={HTML5Backend}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-slate-200">설정</h2>
                  <button
                    onClick={resetSettings}
                    className="px-3 py-1 bg-slate-600/70 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-all duration-300 flex items-center"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    초기화
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="mb-3">
                    <p className="text-sm text-slate-300 mb-3">
                      이미지를 드래그하여 순서를 변경할 수 있습니다.
                    </p>
                    {renderImageInputs()}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      레이아웃 스타일
                    </label>
                    <select
                      value={layout}
                      onChange={(e) => setLayout(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    >
                      <option value="portrait">세로형 (인생네컷 스타일)</option>
                      <option value="square">정사각형 (2x2 그리드)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      테두리 색상
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="color"
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        className="w-10 h-10 rounded-lg bg-transparent"
                      />
                      <span className="text-slate-300">{borderColor}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      사진 사이 간격 색상
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="color"
                        value={gapColor}
                        onChange={(e) => setGapColor(e.target.value)}
                        className="w-10 h-10 rounded-lg bg-transparent"
                      />
                      <span className="text-slate-300">{gapColor}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      간격 크기 - {gapSize}px
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={1}
                      value={gapSize}
                      onChange={(e) => setGapSize(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      테두리 크기 - {borderSize}px
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={borderSize}
                      onChange={(e) => setBorderSize(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                    />
                  </div>

                  <button
                    onClick={processImages}
                    disabled={images.some((img) => !img.file) || isLoading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl hover:from-teal-600 hover:to-blue-600 transition-all duration-300 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? "처리 중..." : "포토부스 이미지 생성"}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 shadow-lg">
                <h2 className="text-xl font-semibold text-slate-200 mb-4">
                  결과
                </h2>
                <div className="flex items-center justify-center min-h-80 bg-slate-800/50 rounded-lg border border-slate-600/50 overflow-hidden relative">
                  {resultImage ? (
                    <Image
                      src={resultImage}
                      alt="포토부스 이미지"
                      width={400}
                      height={layout === "portrait" ? 800 : 400}
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    <span className="text-slate-400">
                      4개의 이미지를 업로드하고 생성 버튼을 눌러주세요
                    </span>
                  )}
                </div>

                {resultImage && (
                  <button
                    onClick={downloadImage}
                    className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg hover:from-blue-700 hover:to-blue-900 transition-all duration-300 font-medium flex items-center justify-center"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    이미지 다운로드
                  </button>
                )}
              </div>
            </div>
          </div>
        </DndProvider>
      </div>
    </MainLayout>
  );
}
