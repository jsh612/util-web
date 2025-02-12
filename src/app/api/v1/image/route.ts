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

    const buffer = Buffer.from(await imageFile.arrayBuffer());

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
        fit: "cover", // 이미지를 자르면서 채우기
        position: "center", // 중앙을 기준으로 자르기
      })
      .toBuffer();

    // 제목과 본문의 Y 위치 계산
    const titleY = Math.floor(targetHeight * 0.2); // 상단 20% 위치
    const titleLineHeight = (textOptions.titleFontSize ?? 64) * 1.2;
    const textLineHeight = (textOptions.textFontSize ?? 48) * 1.2;
    const spaceBetweenTitleAndText = Math.max(titleLineHeight, textLineHeight);

    // 본문 시작 위치 계산
    let textY: number;
    if (textOptions.title?.trim()) {
      const titleLines = textOptions.title.split("\n").length;
      textY = titleY + titleLines * titleLineHeight + spaceBetweenTitleAndText;
    } else {
      textY = Math.floor(targetHeight * 0.4); // 제목이 없을 경우 상단 40% 위치
    }

    // SVG 텍스트 생성
    const svgText = `
      <svg width="${targetWidth}" height="${targetHeight}">
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
        ${
          textOptions.title
            ? textOptions.title
                .split("\n")
                .map(
                  (line, i) =>
                    `<text x="${targetWidth / 2}" y="${
                      titleY + i * titleLineHeight
                    }" class="title">${line}</text>`
                )
                .join("")
            : ""
        }
        ${
          textOptions.text
            ? textOptions.text
                .split("\n")
                .map(
                  (line, i) =>
                    `<text x="${targetWidth / 2}" y="${
                      textY + i * textLineHeight
                    }" class="text">${line}</text>`
                )
                .join("")
            : ""
        }
      </svg>
    `;

    // 최종 이미지 생성
    const finalImage = await sharp(resizedImage)
      .composite([
        {
          input: Buffer.from(svgText),
          top: 0,
          left: 0,
        },
      ])
      .jpeg()
      .toBuffer();

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
