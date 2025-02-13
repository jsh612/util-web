import { ComponentResponse, CreateComponentDto } from "@/types/api.types";
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

      // 디렉토리 경로 생성
      const componentDir = path.join(
        process.cwd(),
        createComponentDto.filePath,
        createComponentDto.fileName
      );

      // 디렉토리 생성
      await fs.mkdir(componentDir, { recursive: true });

      // 프롬프트 파일 저장
      const promptPath = path.join(componentDir, "prompt.txt");
      await fs.writeFile(promptPath, promptText, "utf-8");

      // 첨부 파일 처리
      const savedFiles: string[] = [];
      if (
        createComponentDto.files &&
        Array.isArray(createComponentDto.files) &&
        createComponentDto.files.length > 0
      ) {
        if (createComponentDto.files.length > 5) {
          throw new Error("첨부 파일은 최대 5개까지만 가능합니다.");
        }

        const filesDir = path.join(componentDir, "attachments");
        await fs.mkdir(filesDir, { recursive: true });

        for (const file of createComponentDto.files) {
          try {
            if (!(file instanceof File)) {
              console.log("유효하지 않은 파일 객체:", file);
              continue;
            }

            if (file.size === 0) {
              console.log("빈 파일 건너뛰기:", file.name);
              continue;
            }

            if (file.type !== "application/pdf") {
              const filePath = path.join(filesDir, file.name);
              const arrayBuffer = await file.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              await fs.writeFile(filePath, buffer);
              savedFiles.push(filePath);
            }
          } catch (error) {
            console.error("파일 처리 중 오류:", file.name, error);
          }
        }
      }

      return {
        message: "컴포넌트 프롬프트가 생성되었습니다.",
        path: promptPath,
        attachments: savedFiles,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("컴포넌트 생성 중 알 수 없는 오류가 발생했습니다.");
    }
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
