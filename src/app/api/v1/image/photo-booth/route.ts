import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const images: Buffer[] = [];
    const borderColor = (formData.get("borderColor") as string) || "#FFFFFF";
    const gapColor = (formData.get("gapColor") as string) || "#FFFFFF";
    const gapSize = parseInt((formData.get("gapSize") as string) || "20");
    const borderSize = parseInt((formData.get("borderSize") as string) || "40");
    const layout = (formData.get("layout") as string) || "portrait"; // portrait 또는 square

    // 이미지 4개 가져오기
    for (let i = 1; i <= 4; i++) {
      const imageFile = formData.get(`image${i}`) as File;
      if (!imageFile) {
        return NextResponse.json(
          { error: `이미지 ${i}이(가) 없습니다.` },
          { status: 400 }
        );
      }

      try {
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        images.push(buffer);
      } catch (error) {
        console.error(`이미지 ${i} 변환 오류:`, error);
        return NextResponse.json(
          { error: `파일 ${i}을(를) 처리할 수 없습니다.` },
          { status: 400 }
        );
      }
    }

    try {
      // 레이아웃에 따른 크기 설정
      let imgWidth, imgHeight, finalWidth, finalHeight;

      if (layout === "portrait") {
        // 세로형 포토부스 스타일 (인생네컷, 하루필름 등)
        imgWidth = 500;
        imgHeight = 350; // 더 납작한 비율

        // 세로로 4장 배치 (1열 4행)
        finalWidth = imgWidth + borderSize * 2;
        finalHeight = imgHeight * 4 + gapSize * 3 + borderSize * 2;
      } else {
        // 기존 정사각형 스타일 (2x2 그리드)
        imgWidth = 500;
        imgHeight = 500;

        finalWidth = imgWidth * 2 + gapSize + borderSize * 2;
        finalHeight = imgHeight * 2 + gapSize + borderSize * 2;
      }

      // 기본 배경 생성 (테두리 색상)
      const baseCanvas = sharp({
        create: {
          width: finalWidth,
          height: finalHeight,
          channels: 4,
          background: borderColor,
        },
      });

      // 리사이징된 이미지들 준비
      const processedImages = await Promise.all(
        images.map(async (img, index) => {
          try {
            const resized = await sharp(img)
              .resize(imgWidth, imgHeight, { fit: "cover" })
              .png()
              .toBuffer();
            return {
              success: true,
              buffer: resized,
              index: index + 1,
            };
          } catch (err) {
            console.error(`이미지 ${index + 1} 리사이징 오류:`, err);
            return {
              success: false,
              index: index + 1,
            };
          }
        })
      );

      // 실패한 이미지 확인
      const failedImages = processedImages.filter((img) => !img.success);
      if (failedImages.length > 0) {
        return NextResponse.json(
          {
            error: `이미지 ${failedImages
              .map((img) => img.index)
              .join(", ")}을(를) 처리할 수 없습니다.`,
          },
          { status: 400 }
        );
      }

      // 모든 이미지가 성공적으로 처리됨
      const validImages = processedImages.filter(
        (img) => img.success
      ) as Array<{ success: true; buffer: Buffer; index: number }>;

      // 갭 이미지들 생성
      let compositeArray = [];

      if (layout === "portrait") {
        // 세로형 레이아웃일 경우 - 수평 갭만 추가 (3개)
        for (let i = 0; i < 3; i++) {
          const horizontalGap = Buffer.from(
            await sharp({
              create: {
                width: imgWidth,
                height: gapSize,
                channels: 4,
                background: gapColor,
              },
            })
              .png()
              .toBuffer()
          );

          compositeArray.push({
            input: horizontalGap,
            top: borderSize + imgHeight * (i + 1) + gapSize * i,
            left: borderSize,
          });
        }

        // 이미지 4장 세로로 배치
        compositeArray = [
          ...compositeArray,
          {
            input: validImages[0].buffer,
            top: borderSize,
            left: borderSize,
          },
          {
            input: validImages[1].buffer,
            top: borderSize + imgHeight + gapSize,
            left: borderSize,
          },
          {
            input: validImages[2].buffer,
            top: borderSize + (imgHeight + gapSize) * 2,
            left: borderSize,
          },
          {
            input: validImages[3].buffer,
            top: borderSize + (imgHeight + gapSize) * 3,
            left: borderSize,
          },
        ];
      } else {
        // 정사각형 레이아웃 (2x2 그리드)
        // 수직 갭
        const verticalGap = Buffer.from(
          await sharp({
            create: {
              width: gapSize,
              height: imgHeight * 2 + gapSize,
              channels: 4,
              background: gapColor,
            },
          })
            .png()
            .toBuffer()
        );

        // 수평 갭
        const horizontalGap = Buffer.from(
          await sharp({
            create: {
              width: imgWidth * 2 + gapSize,
              height: gapSize,
              channels: 4,
              background: gapColor,
            },
          })
            .png()
            .toBuffer()
        );

        compositeArray = [
          {
            input: verticalGap,
            top: borderSize,
            left: borderSize + imgWidth,
          },
          {
            input: horizontalGap,
            top: borderSize + imgHeight,
            left: borderSize,
          },
          {
            input: validImages[0].buffer,
            top: borderSize,
            left: borderSize,
          },
          {
            input: validImages[1].buffer,
            top: borderSize,
            left: borderSize + imgWidth + gapSize,
          },
          {
            input: validImages[2].buffer,
            top: borderSize + imgHeight + gapSize,
            left: borderSize,
          },
          {
            input: validImages[3].buffer,
            top: borderSize + imgHeight + gapSize,
            left: borderSize + imgWidth + gapSize,
          },
        ];
      }

      // 합성
      try {
        const compositeImage = await baseCanvas
          .composite(compositeArray)
          .png()
          .toBuffer();

        return new NextResponse(compositeImage, {
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition":
              'attachment; filename="photo-booth-result.png"',
          },
        });
      } catch (compositeError) {
        console.error("이미지 합성 오류:", compositeError);
        return NextResponse.json(
          { error: "이미지 합성 중 오류가 발생했습니다." },
          { status: 500 }
        );
      }
    } catch (processingError) {
      console.error("이미지 처리 오류:", processingError);
      return NextResponse.json(
        { error: "이미지 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("포토부스 이미지 처리 중 오류:", error);
    return NextResponse.json(
      { error: "이미지 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
