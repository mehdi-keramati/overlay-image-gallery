import type { ReactNode } from "react";

export interface GalleryImage {
  src: string;
  alt?: string;
  caption?: string;
  category?: string;
}

export type GalleryItem = string | GalleryImage;

export type GridVariant = "mosaic" | "featured" | "uniform";

export type FitMode = "contain" | "cover" | "fill" | "none" | "scale-down";

export interface OverlayGalleryProps {
  images: GalleryItem[];
  variant?: GridVariant;
  fitMode?: FitMode;
  maxTiles?: number;
  fullScreen?: boolean;
  width?: number;
  height?: number;
  showThumbnails?: boolean;
  zoom?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  autoplayInterval?: number;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  showFilters?: boolean;
  defaultCategory?: string;
  allLabel?: string;
  className?: string;
  onOpen?: (index: number) => void;
  onClose?: () => void;
  onIndexChange?: (index: number) => void;
  onFilterChange?: (category: string) => void;
}

/** @deprecated Use `OverlayGalleryProps` instead. */
export type ImageGalleryProps = OverlayGalleryProps;
