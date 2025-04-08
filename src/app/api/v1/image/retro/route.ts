import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/**
 * 2009년 화질로 이미지를 변환하는 API
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("imageFile") as File;
    const quality = Number(formData.get("quality") || "15"); // 기본값 15%
    const addNoise = formData.get("addNoise") === "true"; // 노이즈 추가 여부
    const level =
      (formData.get("level") as "low" | "medium" | "high") || "medium";

    if (!imageFile) {
      return NextResponse.json(
        { error: "이미지 파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 이미지 형식 검증
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "유효하지 않은 이미지 형식입니다." },
        { status: 400 }
      );
    }

    try {
      // 원본 이미지 버퍼로 변환
      const buffer = await imageFile.arrayBuffer();

      // 이미지 크기 및 출력 크기 계산
      const { width, height } = await sharp(buffer).metadata();

      if (!width || !height) {
        throw new Error("이미지 크기를 가져올 수 없습니다.");
      }

      // 원본 이미지 비율 유지
      const aspectRatio = width / height;

      // 화질 레벨에 따른 크기 설정
      let resizeOptions: { width: number; height: number; fit: string } = {
        width: 480,
        height: 360,
        fit: "inside",
      };

      switch (level) {
        case "low":
          resizeOptions = {
            width: Math.round(640),
            height: Math.round(640 / aspectRatio),
            fit: "inside",
          };
          break;
        case "medium":
          resizeOptions = {
            width: Math.round(480),
            height: Math.round(480 / aspectRatio),
            fit: "inside",
          };
          break;
        case "high":
          resizeOptions = {
            width: Math.round(320),
            height: Math.round(320 / aspectRatio),
            fit: "inside",
          };
          break;
      }

      // 출력 이미지 크기
      const outputWidth = Math.min(width, resizeOptions.width);
      const outputHeight = Math.round(outputWidth / aspectRatio);

      // 1. 해상도 낮추기
      let processedImage = sharp(buffer).resize(
        resizeOptions.width,
        resizeOptions.height,
        {
          fit: "inside",
          withoutEnlargement: true,
        }
      );

      // 2. 다시 원본 크기로 확대 (픽셀화 효과)
      processedImage = processedImage.resize(outputWidth, outputHeight, {
        fit: "fill",
        kernel: "nearest", // 픽셀화된 느낌을 위해 nearest neighbor 사용
      });

      // 노이즈 추가
      if (addNoise) {
        // SVG로 노이즈 생성
        let svgNoise =
          '<svg xmlns="http://www.w3.org/2000/svg" width="' +
          outputWidth +
          '" height="' +
          outputHeight +
          '">';

        const noisePixelSize = level === "high" ? 4 : level === "low" ? 1 : 2;
        const noiseCount = Math.floor((outputWidth * outputHeight) / 200);

        // 랜덤 픽셀 생성
        for (let i = 0; i < noiseCount; i++) {
          const x = Math.floor(Math.random() * outputWidth);
          const y = Math.floor(Math.random() * outputHeight);
          const opacity = Math.random() * 0.15;
          const size = Math.random() * noisePixelSize + 1;

          svgNoise +=
            '<rect x="' +
            x +
            '" y="' +
            y +
            '" width="' +
            size +
            '" height="' +
            size +
            '" fill="white" fill-opacity="' +
            opacity +
            '" />';

          // 가끔은 검은색 노이즈도 추가
          if (Math.random() > 0.7) {
            const blackX = Math.floor(Math.random() * outputWidth);
            const blackY = Math.floor(Math.random() * outputHeight);
            svgNoise +=
              '<rect x="' +
              blackX +
              '" y="' +
              blackY +
              '" width="' +
              size +
              '" height="' +
              size +
              '" fill="black" fill-opacity="' +
              opacity * 0.7 +
              '" />';
          }
        }

        svgNoise += "</svg>";

        // SVG 노이즈를 버퍼로 변환하고 이미지에 합성
        const noiseBuf = Buffer.from(svgNoise);
        const noiseImage = await sharp(noiseBuf).png().toBuffer();

        // 노이즈 레이어를 이미지에 합성
        processedImage = processedImage.composite([
          {
            input: noiseImage,
            blend: "overlay",
          },
        ]);
      }

      // 4. 색상 보정 (2009년 느낌을 위한 채도 감소 및 콘트라스트 조정)
      processedImage = processedImage
        .modulate({
          saturation: 0.8, // 채도 감소
          brightness: 1.05, // 약간 밝게
        })
        .gamma(1.1) // 감마 조정
        .sharpen(0.5); // 살짝 선명하게

      // 최종 JPEG 압축
      processedImage = processedImage.jpeg({
        quality: quality, // 사용자가 설정한 품질
        chromaSubsampling: "4:2:0", // 크로마 서브샘플링 (색상 정보 감소)
      });

      // 최종 이미지 생성
      const finalImage = await processedImage.toBuffer();

      return new NextResponse(finalImage, {
        headers: {
          "Content-Type": "image/jpeg",
        },
      });
    } catch (error) {
      console.error("Error processing retro image:", error);
      return NextResponse.json(
        { error: "이미지 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing retro image:", error);
    return NextResponse.json(
      { error: "이미지 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
