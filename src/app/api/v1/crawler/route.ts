import { CrawlerService } from "@/app/utils/crawler";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const encodedUrl = searchParams.get("url");

    if (!encodedUrl) {
      return NextResponse.json(
        { error: "URL 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    // URL 디코딩 처리
    const url = decodeURIComponent(decodeURIComponent(encodedUrl));

    const crawlerService = new CrawlerService();
    const result = await crawlerService.crawlArticle(url);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
