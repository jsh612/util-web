import { ImageTextOptions } from "@/types/api.types";
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import sharp from "sharp";

// HTML 템플릿 생성 함수
async function generateHtml(
  width: number,
  height: number,
  textOptions: ImageTextOptions,
  backgroundColor?: string
): Promise<string> {
  const titleY = Math.floor(height * 0.2);
  const titleLineHeight = (textOptions.titleFontSize ?? 64) * 1.2;
  const textLineHeight = (textOptions.textFontSize ?? 48) * 1.2;
  const spaceBetweenTitleAndText = Math.max(titleLineHeight, textLineHeight);

  let textY: number;
  if (textOptions.title?.trim()) {
    const titleLines = textOptions.title.split("\n").length;
    textY = titleY + titleLines * titleLineHeight + spaceBetweenTitleAndText;
  } else {
    textY = Math.floor(height * 0.4);
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          @font-face {
            font-family: 'Cafe24Syongsyong';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_twelve@1.1/Cafe24Syongsyong.woff') format('woff');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'Cafe24Ssurround';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/Cafe24Ssurround.woff') format('woff');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'Cafe24SsurroundAir';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/Cafe24SsurroundAir.woff') format('woff');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'Cafe24Ohsquare';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2202@1.0/Cafe24Ohsquareair.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'Cafe24Simplehae';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_twelve@1.1/Cafe24Simplehae.woff') format('woff');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'Cafe24Dangdanghae';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.2/Cafe24Dangdanghae.woff') format('woff');
            font-weight: normal;
            font-style: normal;
          }

          body {
            margin: 0;
            padding: 0;
            width: ${width}px;
            height: ${height}px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: ${backgroundColor || "transparent"};
            position: relative;
          }

          .text-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .title {
            font-family: "${textOptions.fontFamily}", Arial;
            font-size: ${textOptions.titleFontSize ?? 64}px;
            color: ${textOptions.titleColor ?? "#ffffff"};
            text-align: center;
            font-weight: bold;
            white-space: pre-line;
            position: absolute;
            top: ${titleY}px;
            width: 100%;
            line-height: 1.2;
          }

          .content {
            font-family: "${textOptions.fontFamily}", Arial;
            font-size: ${textOptions.textFontSize ?? 48}px;
            color: ${textOptions.textColor ?? "#ffffff"};
            text-align: center;
            white-space: pre-line;
            position: absolute;
            top: ${textY}px;
            width: 100%;
            line-height: 1.2;
          }

          .bottom {
            font-family: "${textOptions.fontFamily}", Arial;
            font-size: ${textOptions.bottomFontSize ?? 32}px;
            color: ${textOptions.bottomColor ?? "#ffffff"};
            text-align: center;
            white-space: pre-line;
            position: absolute;
            bottom: 50px;
            width: 100%;
            line-height: 1.2;
          }
        </style>
      </head>
      <body>
        <div class="text-container">
          ${
            textOptions.title
              ? `<div class="title">${textOptions.title}</div>`
              : ""
          }
          ${
            textOptions.content
              ? `<div class="content">${textOptions.content}</div>`
              : ""
          }
          ${
            textOptions.bottom
              ? `<div class="bottom">${textOptions.bottom}</div>`
              : ""
          }
        </div>
      </body>
    </html>
  `;
}

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

    // 텍스트 옵션 검증 추가
    if (!textOptions.content && textOptions.textMode === "single") {
      return NextResponse.json(
        { error: "텍스트 내용이 필요합니다." },
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

    // 고해상도 렌더링을 위한 스케일 팩터
    const scaleFactor = 2;
    const renderWidth = targetWidth * scaleFactor;
    const renderHeight = targetHeight * scaleFactor;

    // Puppeteer 브라우저 실행
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // 뷰포트 크기 설정 (고해상도)
    await page.setViewport({
      width: renderWidth,
      height: renderHeight,
      deviceScaleFactor: 1,
    });

    // 폰트 크기를 스케일 팩터에 맞게 조정한 옵션 생성
    const scaledTextOptions = {
      ...textOptions,
      titleFontSize: (textOptions.titleFontSize ?? 64) * scaleFactor,
      textFontSize: (textOptions.textFontSize ?? 48) * scaleFactor,
      bottomFontSize: (textOptions.bottomFontSize ?? 32) * scaleFactor,
    };

    // HTML 생성 및 설정 (이제 async 함수)
    const html = await generateHtml(
      renderWidth,
      renderHeight,
      scaledTextOptions
    );
    await page.setContent(html);

    // 폰트 로딩 대기 (시간 추가)
    await page.waitForFunction(() => document.fonts.ready);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 폰트 로딩을 위한 추가 대기 시간

    // 텍스트 레이어 스크린샷
    const textLayer = await page.screenshot({
      omitBackground: true,
      type: "png",
    });

    await browser.close();

    // 텍스트 레이어 크기 조정
    const resizedTextLayer = await sharp(textLayer)
      .resize(targetWidth, targetHeight, {
        fit: "contain",
        position: "center",
      })
      .toBuffer();

    // 이미지 합성
    const finalImage = await sharp(resizedImage)
      .composite([
        {
          input: resizedTextLayer,
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
