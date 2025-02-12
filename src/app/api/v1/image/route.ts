import { ImageTextOptions } from "@/types/api.types";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("imageFile") as File;
    const textOptionsStr = formData.get("textOptions") as string;
    const textOptions: ImageTextOptions = JSON.parse(textOptionsStr);

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

    const buffer = Buffer.from(await imageFile.arrayBuffer());

    // 원본 이미지 검증
    try {
      await sharp(buffer).metadata();
    } catch (error) {
      console.error("Error processing image:", error);
      return NextResponse.json(
        { error: "이미지 형식을 처리할 수 없습니다." },
        { status: 400 }
      );
    }

    // 인스타그램 비율에 따른 크기 조정
    const targetWidth = 1080;
    let targetHeight = 1080;

    switch (textOptions.instagramRatio) {
      case "portrait":
        targetHeight = 1350;
        break;
      case "landscape":
        targetHeight = 566;
        break;
      default: // square
        targetHeight = 1080;
    }

    // 원본 이미지를 비율에 맞게 자르기
    const resizedImage = await sharp(buffer)
      .resize(targetWidth, targetHeight, {
        fit: "cover",
        position: "center",
      })
      .toBuffer();

    let finalImage;

    if (textOptions.textMode === "single") {
      // 단일 텍스트 모드
      const titleY = Math.floor(targetHeight * 0.2);
      const titleLineHeight = (textOptions.titleFontSize ?? 64) * 1.2;
      const textLineHeight = (textOptions.textFontSize ?? 48) * 1.2;
      const spaceBetweenTitleAndText = Math.max(
        titleLineHeight,
        textLineHeight
      );

      let textY: number;
      if (textOptions.title?.trim()) {
        const titleLines = textOptions.title.split("\n").length;
        textY =
          titleY + titleLines * titleLineHeight + spaceBetweenTitleAndText;
      } else {
        textY = Math.floor(targetHeight * 0.4);
      }

      const svgText = generateSvgText(
        targetWidth,
        targetHeight,
        textOptions.title || "",
        textOptions.text || "",
        titleY,
        textY,
        textOptions
      );

      // SVG 텍스트를 Buffer로 변환
      const svgBuffer = Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        ${svgText}`
      );

      finalImage = await sharp(resizedImage)
        .composite([
          {
            input: svgBuffer,
            top: 0,
            left: 0,
          },
        ])
        .jpeg()
        .toBuffer();
    } else {
      // 다중 텍스트 모드
      if (!textOptions.textArray?.length) {
        return NextResponse.json(
          { error: "텍스트 배열이 필요합니다." },
          { status: 400 }
        );
      }

      // 각 텍스트 세트의 높이 계산
      const setHeight = targetHeight / textOptions.textArray.length;
      const svgTexts = textOptions.textArray.map((textSet, index) => {
        const titleY = Math.floor(setHeight * index + setHeight * 0.2);
        const titleLineHeight = (textOptions.titleFontSize ?? 64) * 1.2;
        const textLineHeight = (textOptions.textFontSize ?? 48) * 1.2;
        const spaceBetweenTitleAndText = Math.max(
          titleLineHeight,
          textLineHeight
        );

        const textY = titleY + titleLineHeight + spaceBetweenTitleAndText;

        return generateSvgText(
          targetWidth,
          targetHeight,
          textSet.title,
          textSet.content,
          titleY,
          textY,
          textOptions
        );
      });

      // SVG 텍스트를 Buffer로 변환
      const svgBuffer = Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
          <style>
            .title { 
              font-family: ${textOptions.fontFamily ?? "Arial"};
              font-size: ${textOptions.titleFontSize ?? 64}px;
              fill: ${textOptions.titleColor ?? "#ffffff"};
              text-anchor: middle;
              font-weight: bold;
            }
            .text { 
              font-family: ${textOptions.fontFamily ?? "Arial"};
              font-size: ${textOptions.textFontSize ?? 48}px;
              fill: ${textOptions.textColor ?? "#ffffff"};
              text-anchor: middle;
            }
          </style>
          ${svgTexts.join("")}
        </svg>`
      );

      finalImage = await sharp(resizedImage)
        .composite([
          {
            input: svgBuffer,
            top: 0,
            left: 0,
          },
        ])
        .jpeg()
        .toBuffer();
    }

    return new NextResponse(finalImage, {
      headers: {
        "Content-Type": "image/jpeg",
      },
    });
  } catch (error) {
    console.error("Error processing image:", error);
    return NextResponse.json(
      { error: "이미지 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// SVG 텍스트 생성 헬퍼 함수
function generateSvgText(
  targetWidth: number,
  targetHeight: number,
  title: string,
  text: string,
  titleY: number,
  textY: number,
  options: ImageTextOptions
): string {
  return `
    <svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { 
          font-family: ${options.fontFamily ?? "Arial"};
          font-size: ${options.titleFontSize ?? 64}px;
          fill: ${options.titleColor ?? "#ffffff"};
          text-anchor: middle;
          font-weight: bold;
        }
        .text { 
          font-family: ${options.fontFamily ?? "Arial"};
          font-size: ${options.textFontSize ?? 48}px;
          fill: ${options.textColor ?? "#ffffff"};
          text-anchor: middle;
        }
      </style>
      ${
        title
          ? title
              .split("\n")
              .map(
                (line, i) =>
                  `<text x="${targetWidth / 2}" y="${
                    titleY + i * (options.titleFontSize ?? 64) * 1.2
                  }" class="title">${line}</text>`
              )
              .join("")
          : ""
      }
      ${
        text
          ? text
              .split("\n")
              .map(
                (line, i) =>
                  `<text x="${targetWidth / 2}" y="${
                    textY + i * (options.textFontSize ?? 48) * 1.2
                  }" class="text">${line}</text>`
              )
              .join("")
          : ""
      }
    </svg>
  `;
}
