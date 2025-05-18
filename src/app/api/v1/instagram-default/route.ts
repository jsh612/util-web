import { existsSync, unlinkSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

const DEFAULT_IMAGE_PATH = path.join(
  process.cwd(),
  "public/image/instagram-default"
);

export async function GET() {
  try {
    if (!existsSync(DEFAULT_IMAGE_PATH + ".png")) {
      return NextResponse.json(
        { error: "기본 이미지가 없습니다." },
        { status: 404 }
      );
    }

    const imageBuffer = await readFile(DEFAULT_IMAGE_PATH + ".png");
    return new NextResponse(imageBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
      },
    });
  } catch (error) {
    console.error("기본 이미지 로드 에러:", error);
    return NextResponse.json(
      { error: "기본 이미지를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "이미지 파일이 필요합니다." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 기존 파일이 있다면 삭제
    if (existsSync(DEFAULT_IMAGE_PATH + ".png")) {
      unlinkSync(DEFAULT_IMAGE_PATH + ".png");
    }

    // 새 파일 저장 (항상 PNG로 저장)
    await writeFile(DEFAULT_IMAGE_PATH + ".png", buffer);

    return NextResponse.json({ message: "기본 이미지가 저장되었습니다." });
  } catch (error) {
    console.error("기본 이미지 저장 에러:", error);
    return NextResponse.json(
      { error: "기본 이미지 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    if (!existsSync(DEFAULT_IMAGE_PATH + ".png")) {
      return NextResponse.json(
        { error: "기본 이미지가 없습니다." },
        { status: 404 }
      );
    }

    unlinkSync(DEFAULT_IMAGE_PATH + ".png");
    return NextResponse.json({ message: "기본 이미지가 삭제되었습니다." });
  } catch (error) {
    console.error("기본 이미지 삭제 에러:", error);
    return NextResponse.json(
      { error: "기본 이미지 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
