import {
  ComponentResponse,
  CreateComponentDto,
} from "@/types/figma-to-component.types";
import { Buffer } from "buffer";
import * as fs from "fs/promises";
import * as path from "path";
import pdfParse from "pdf-parse";
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

      // PDF 파일이 있다면 텍스트 추출
      let extractedText = "";
      if (createComponentDto.files?.length) {
        extractedText = await this.extractTextFromFiles(
          createComponentDto.files
        );
      }

      // 프롬프트 텍스트 생성
      const promptText = this.generatePromptText(
        figmaData,
        createComponentDto,
        extractedText
      );

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

      // 첨부 파일 처리 (PDF 제외)
      const savedFiles: string[] = [];
      if (createComponentDto.files?.length) {
        const filesDir = path.join(
          basePath,
          `${createComponentDto.fileName}_files`
        );
        await fs.mkdir(filesDir, { recursive: true });

        for (const file of createComponentDto.files) {
          if (file.type !== "application/pdf") {
            const filePath = path.join(filesDir, file.name);
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await fs.writeFile(filePath, buffer);
            savedFiles.push(filePath);
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

  private async extractTextFromFiles(files: File[]): Promise<string> {
    const texts: string[] = [];

    for (const file of files) {
      try {
        if (file.type === "application/pdf") {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const data = await pdfParse(buffer);
          texts.push(`[PDF: ${file.name}]\n${data.text}\n`);
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

  private generatePromptText(
    figmaData: unknown,
    dto: CreateComponentDto,
    extractedText: string
  ): string {
    const defaultPrompt = `
# 너는 최고의 프론트엔드 개발자야 다음 내용을 참고해서 컴포넌트를 생성해줘

# 기본 사항:
- Nextjs, TailwindCSS, Typescript, React 를 통해 컴포넌트 생성 필요
- Text 컴포넌트는 '@/stories/common/Text' 경로에 있는 컴포넌트 참고해서 진행
- Button 컴포넌트는 '@/stories/common/Button' 경로에 있는 컴포넌트 참고해서 진행 
- 그외 다른 부분도 기존 코드들 중 공통 컴포넌트 활용해서 진행
- 디렉토리, 파일 규칙 등은 기존 코드 참고 
`;

    return `
${defaultPrompt}

# Figma 파일 정보:
${JSON.stringify(figmaData, null, 2)}

${dto.description ? `# 컴포넌트 설명:\n${dto.description}\n` : ""}
${extractedText ? `# 컴포넌트 설명 관련 첨부 파일 내용:\n${extractedText}` : ""}
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
