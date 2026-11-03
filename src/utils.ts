import type { GalleryImage, GalleryItem } from "./types";

export const normalizeItems = (items: GalleryItem[]): GalleryImage[] =>
  items.map((item) => (typeof item === "string" ? { src: item } : item));

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const preloadImage = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });

export const fileNameFromUrl = (url: string): string => {
  try {
    const { pathname } = new URL(url, "https://overlay.gallery");
    return pathname.split("/").pop() || "image";
  } catch {
    return "image";
  }
};
