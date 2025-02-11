import { CrawlResponse } from "@/types/api.types";
import axios from "axios";
import * as cheerio from "cheerio";

export class CrawlerService {
  async crawlArticle(url: string): Promise<CrawlResponse> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      if (url.includes("news.naver.com")) {
        return this.crawlNaverNews($);
      } else if (url.includes("cnn.com")) {
        return this.crawlCnnNews($);
      } else {
        throw new Error(
          "지원하지 않는 뉴스 사이트입니다. (현재 Naver News, CNN만 지원)"
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`크롤링 중 오류가 발생했습니다: ${error.message}`);
      }
      throw new Error("알 수 없는 오류가 발생했습니다.");
    }
  }

  private crawlNaverNews($: cheerio.CheerioAPI): CrawlResponse {
    const title = $(".media_end_head_headline span").first().text().trim();
    const content = $("#dic_area").text().trim();
    const date = $(".media_end_head_info_datestamp_time._ARTICLE_DATE_TIME")
      .first()
      .text()
      .trim();
    const publisher =
      $(".media_end_head_top_logo_text").first().text().trim() ||
      $(".media_end_head_top_logo img").first().attr("alt") ||
      "언론사 정보 없음";
    const author =
      $(".media_end_head_journalist_name").first().text().trim() ||
      "작성자 정보 없음";

    return {
      type: "naver",
      title,
      content,
      date,
      publisher,
      author,
    };
  }

  private crawlCnnNews($: cheerio.CheerioAPI): CrawlResponse {
    const title =
      $(".headline__text").first().text().trim() ||
      $("h1.headline").first().text().trim();

    const paragraphs = $(".article__content .paragraph")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text.length > 0);

    const content = paragraphs.join("\n\n");
    const publisher = $(".source__text").first().text().trim() || "CNN";
    const author =
      $(".byline__name").first().text().trim() ||
      $(".source__text").first().text().trim() ||
      "CNN";

    return {
      type: "cnn",
      title,
      content,
      publisher,
      author,
    };
  }
}
