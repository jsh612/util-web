export interface Scene {
  scene: number;
  subtitle: string;
  image_prompt: string;
  narration: string;
}

export interface ShortsScript {
  scenes: Scene[];
  shorts_title: string;
  shorts_description: string;
}
