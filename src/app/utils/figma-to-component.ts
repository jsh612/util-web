import { API_BASE_URL, API_ROUTES } from "@/constants/routes";
import { ComponentResponse, CreateComponentDto } from "@/types/api.types";
import axios from "axios";
import * as fs from "fs/promises";
import * as path from "path";
import { FigmaService } from "./figma";

export class ComponentService {
  private figmaService: FigmaService;

  constructor() {
    this.figmaService = new FigmaService();
  }

  async createComponent(
    createComponentDto: CreateComponentDto
  ): Promise<ComponentResponse> {
    try {
      // Figma URL에서 파일 ID와 노드 ID 추출
      const urlPattern = /figma\.com\/design\/([^/]+).*node-id=([^&]+)/;
      const matches = createComponentDto.figmaUrl.match(urlPattern);

      if (!matches) {
        throw new Error(
          "올바른 Figma 파일 URL이 아닙니다. (예: https://www.figma.com/design/xxxxx?node-id=xxxx)"
        );
      }

      const [, fileId, nodeId] = matches;
      const cleanNodeId = nodeId.replace(/-/g, ":"); // 노드 ID 형식 변환 (25463-14451 -> 25463:14451)

      // Figma 파일 데이터 가져오기
      const figmaData = await this.figmaService.getFigmaFile(
        fileId,
        cleanNodeId
      );

      if (!figmaData || typeof figmaData !== "object") {
        throw new Error("Figma API로부터 올바른 데이터를 받지 못했습니다.");
      }

      // 프롬프트 텍스트 생성
      const promptText = this.generatePromptText(createComponentDto);

      // 파일 저장 경로 생성
      const basePath = this.resolvePath(createComponentDto.filePath, "");
      const promptPath = path.join(
        basePath,
        `${createComponentDto.fileName}.txt`
      );

      // 디렉토리 생성
      await fs.mkdir(basePath, { recursive: true });

      // 프롬프트 파일 작성
      await fs.writeFile(promptPath, promptText, "utf-8");

      return {
        message: "컴포넌트 프롬프트가 생성되었습니다.",
        path: promptPath,
        attachments: [],
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("컴포넌트 생성 중 알 수 없는 오류가 발생했습니다.");
    }
  }

  private async extractTextFromFiles(files: File[]): Promise<string> {
    const texts: string[] = [];

    for (const file of files) {
      try {
        if (file.type === "application/pdf") {
          try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await axios.post(
              `${API_BASE_URL}${API_ROUTES.PDF}`,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              }
            );

            if (response.status !== 200) {
              throw new Error("PDF 처리 중 오류가 발생했습니다.");
            }

            const data = response.data;

            texts.push(`[PDF: ${file.name}]\n${data.text}\n`);
          } catch (error) {
            texts.push(
              `[PDF: ${file.name}] PDF 처리 중 오류가 발생했습니다: ${
                error instanceof Error ? error.message : "알 수 없는 오류"
              }`
            );
          }
        } else if (file.type.startsWith("image/")) {
          texts.push(`[Image: ${file.name}]`);
        } else {
          texts.push(
            `[Unsupported: ${file.name}] File type not supported: ${file.type}`
          );
        }
      } catch (error) {
        if (error instanceof Error) {
          texts.push(`[Error processing ${file.name}]: ${error.message}`);
        }
      }
    }

    return texts.join("\n\n");
  }

  private generatePromptText(dto: CreateComponentDto): string {
    return `
${dto.defaultPrompt}

# Figma URL:
${dto.figmaUrl}

${dto.description ? `# 컴포넌트 설명:\n${dto.description}\n` : ""}

${dto.extractedText ? `# 보충 설명:\n${dto.extractedText}\n` : ""}
    `.trim();
  }

  private resolvePath(filePath: string, fileName: string): string {
    if (path.isAbsolute(filePath)) {
      return path.join(filePath, fileName);
    }

    if (filePath.startsWith("../") || filePath.startsWith("..\\")) {
      const projectRoot = process.cwd();
      return path.resolve(projectRoot, filePath, fileName);
    }

    return path.join(process.cwd(), filePath, fileName);
  }
}
