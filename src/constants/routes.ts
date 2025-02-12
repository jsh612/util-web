// API Routes
export const API_ROUTES = {
  CRAWLER: "/api/v1/crawler",
  FIGMA: "/api/v1/figma",
  IMAGE: "/api/v1/image",
  PDF: "/api/v1/pdf",
} as const;

// Page Routes
export const PAGE_ROUTES = {
  HOME: "/",
  INSTAGRAM_POST: "/instagram-post",
  FIGMA: "/figma",
  CRAWLER: "/crawler",
  IMAGE_EDITOR: "/image-editor",
} as const;

// API Base URL
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
