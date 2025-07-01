export interface CreateComponentDto {
  figmaUrl: string;
  filePath: string;
  fileName: string;
  description?: string;
  defaultPrompt: string;
  files?: File[];
  extractedText?: string;
  figmaApiResponse?: string;
}

export interface ComponentResponse {
  message: string;
  path: string;
  attachments: string[];
  generatedFiles?: string[];
}

export interface CrawlResponse {
  url: string;
  title: string;
  content: string;
  publisher?: string;
  author?: string;
  date?: string;
}

export interface ImageTextOptions {
  textMode: "single" | "multiple";
  title?: string;
  content?: string;
  bottom?: string;
  textArray?: Array<{
    title?: string;
    content?: string;
    bottom?: string;
  }>;
  titleFontSize?: number;
  textFontSize?: number;
  bottomFontSize?: number;
  titleColor?: string;
  textColor?: string;
  bottomColor?: string;
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
