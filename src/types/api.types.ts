export interface CreateComponentDto {
  figmaUrl: string;
  filePath: string;
  fileName: string;
  description?: string;
  files?: File[];
}

export interface ComponentResponse {
  message: string;
  path: string;
  attachments: string[];
}

export interface CrawlResponse {
  type: "naver" | "cnn";
  title: string;
  content: string;
  date?: string;
  publisher: string;
  author: string;
}

export interface ImageTextOptions {
  text: string;
  x?: number;
  y?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

export interface AddTextToImageRequest {
  imageFile: File;
  textOptions: ImageTextOptions;
}

export interface AddTextToImageResponse {
  imageUrl: string;
}
