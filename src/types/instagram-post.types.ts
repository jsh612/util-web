import { ImageTextOptions } from "./api.types";

export interface TextResult {
  id: string;
  preview: string;
  textOptions: ImageTextOptions;
}

export interface DragItem {
  id: string;
  index: number;
}

export interface TextInput {
  title: string;
  content: string;
}
