import axios from "axios";

export class FigmaService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.figma.com/v1";

  constructor() {
    const apiKey = process.env.FIGMA_ACCESS_TOKEN;
    if (!apiKey) {
      throw new Error("FIGMA_ACCESS_TOKEN is not defined");
    }
    this.apiKey = apiKey;
  }

  async getFigmaFile(fileId: string, nodeId: string) {
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
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(
            "Figma 파일을 찾을 수 없습니다. 파일 ID와 노드 ID를 확인해주세요."
          );
        }
        if (error.response?.status === 403) {
          throw new Error(
            "Figma API 접근 권한이 없습니다. API 토큰을 확인해주세요."
          );
        }
        throw new Error(
          `Figma API 요청 실패: ${
            error.response?.data?.message || error.message
          }`
        );
      }
      throw error;
    }
  }
}
