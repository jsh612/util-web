import axios from "axios";

export class FigmaService {
  private readonly apiKey: string;
  private readonly apiKeySecondary: string;
  private readonly baseUrl = "https://api.figma.com/v1";

  constructor() {
    const apiKey = process.env.FIGMA_ACCESS_TOKEN;
    const apiKeySecondary = process.env.FIGMA_ACCESS_TOKEN_SECONDARY;

    if (!apiKey) {
      throw new Error("FIGMA_ACCESS_TOKEN is not defined");
    }
    if (!apiKeySecondary) {
      throw new Error("FIGMA_ACCESS_TOKEN_SECONDARY is not defined");
    }

    this.apiKey = apiKey;
    this.apiKeySecondary = apiKeySecondary;
  }

  async getFigmaFile(fileId: string, nodeId: string) {
    const errors = [];

    // 첫 번째 토큰으로 시도
    try {
      const response = await axios.get(
        `${this.baseUrl}/files/${fileId}/nodes?ids=${nodeId}`,
        {
          headers: {
            "X-Figma-Token": this.apiKey,
            Accept: "application/json",
          },
          validateStatus: (status) => status === 200,
        }
      );

      if (!response.data || !response.data.nodes) {
        throw new Error("Figma API 응답이 올바르지 않습니다.");
      }

      return response.data;
    } catch (error) {
      errors.push(error);
    }

    // 두 번째 토큰으로 시도
    try {
      const response = await axios.get(
        `${this.baseUrl}/files/${fileId}/nodes?ids=${nodeId}`,
        {
          headers: {
            "X-Figma-Token": this.apiKeySecondary,
            Accept: "application/json",
          },
          validateStatus: (status) => status === 200,
        }
      );

      if (!response.data || !response.data.nodes) {
        throw new Error("Figma API 응답이 올바르지 않습니다.");
      }

      return response.data;
    } catch (error) {
      errors.push(error);

      const lastError = errors[errors.length - 1];
      if (axios.isAxiosError(lastError)) {
        if (lastError.response?.status === 404) {
          throw new Error(
            "Figma 파일을 찾을 수 없습니다. 파일 ID와 노드 ID를 확인해주세요."
          );
        }
        if (lastError.response?.status === 403) {
          throw new Error(
            "두 Figma 계정 모두 접근 권한이 없습니다. API 토큰을 확인해주세요."
          );
        }
        throw new Error(
          `Figma API 요청 실패: ${
            lastError.response?.data?.message || lastError.message
          }`
        );
      }
      throw lastError;
    }
  }
}
