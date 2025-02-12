import { ImageTextOptions } from "@/types/api.types";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("imageFile") as File;
    const textOptions = JSON.parse(
      formData.get("textOptions") as string
    ) as ImageTextOptions;

    if (!imageFile) {
      return NextResponse.json(
        { error: "이미지 파일이 필요합니다." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const imageInfo = await sharp(buffer).metadata();

    // 인스타그램 이미지 기본 설정
    const defaultOptions = {
      x: textOptions.x ?? Math.floor(imageInfo.width! / 2),
      y: textOptions.y ?? Math.floor(imageInfo.height! * 0.9), // 하단에서 10% 위치
      fontSize: textOptions.fontSize ?? 48,
      color: textOptions.color ?? "#ffffff",
      fontFamily: textOptions.fontFamily ?? "Arial",
    };

    const svgText = `
      <svg width="${imageInfo.width}" height="${imageInfo.height}">
        <style>
          .text {
            font-family: ${defaultOptions.fontFamily};
            font-size: ${defaultOptions.fontSize}px;
            fill: ${defaultOptions.color};
            text-anchor: middle;
          }
        </style>
        <text
          x="${defaultOptions.x}"
          y="${defaultOptions.y}"
          class="text"
        >${textOptions.text}</text>
      </svg>
    `;

    const processedImage = await sharp(buffer)
      .composite([
        {
          input: Buffer.from(svgText),
          top: 0,
          left: 0,
        },
      ])
      .toBuffer();

    return new NextResponse(processedImage, {
      headers: {
        "Content-Type": "image/jpeg",
      },
    });
  } catch (error) {
    console.error("이미지 처리 중 오류 발생:", error);
    return NextResponse.json(
      { error: "이미지 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
