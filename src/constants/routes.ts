// API Routes
export const API_ROUTES = {
  CRAWLER: "/api/v1/crawler",
  FIGMA: "/api/v1/figma",
  IMAGE: "/api/v1/image",
  PDF: "/api/v1/pdf",
  INSTAGRAM_DEFAULT: "/api/v1/instagram-default",
  GEMINI_CHAT: "/api/v1/gemini/chat",
  GEMINI_DOCUMENT: "/api/v1/gemini/document",
  RETRO_IMAGE: "/api/v1/image/retro",
  PHOTO_BOOTH: "/api/v1/image/photo-booth",
  FILES: "/api/v1/files",
} as const;

// Page Routes
export const PAGE_ROUTES = {
  HOME: "/",
  INSTAGRAM_POST: "/instagram-post",
  FIGMA: "/figma",
  CRAWLER: "/crawler",
  IMAGE_EDITOR: "/image-editor",
  GEMINI_CHAT: "/gemini-chat",
  GEMINI_CHAT_STATIC: "/gemini-chat-static",
  RETRO_IMAGE: "/retro-image",
  PHOTO_BOOTH: "/photo-booth",
  SHORTS_GENERATOR: "/shorts-generator",
} as const;

// API Base URL
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
