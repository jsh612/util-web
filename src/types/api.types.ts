export interface CreateComponentDto {
  figmaUrl: string;
  filePath: string;
  fileName: string;
  description?: string;
  defaultPrompt: string;
  files?: File[];
  extractedText?: string;
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
  title?: string;
  text: string;
  titleFontSize?: number;
  textFontSize?: number;
  titleColor?: string;
  textColor?: string;
  fontFamily?: string;
  instagramRatio?: "square" | "portrait" | "landscape";
}

export interface AddTextToImageRequest {
  imageFile: File;
  textOptions: ImageTextOptions;
}

export interface AddTextToImageResponse {
  imageUrl: string;
}
