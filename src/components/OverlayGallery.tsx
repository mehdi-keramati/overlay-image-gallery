import React, { useCallback, useMemo, useState, type CSSProperties } from "react";
import type { FitMode, GalleryImage, OverlayGalleryProps } from "../types";
import { normalizeItems } from "../utils";
import Lightbox from "./Lightbox";
import { Skeleton } from "./Skeleton";
import "../styles/base.css";
import "../styles/gallery.css";

interface TileProps {
  item: GalleryImage;
  index: number;
  fitMode: FitMode;
  extra?: number;
  onOpen: (index: number) => void;
}

const Tile = ({ item, index, fitMode, extra, onOpen }: TileProps) => {
  const [loaded, setLoaded] = useState(false);
  const label = item.alt || item.caption || `Open image ${index + 1}`;

  return (
    <button
      type="button"
      className="oig-tile"
      style={{ "--oig-i": index, "--oig-fit": fitMode } as CSSProperties}
      onClick={() => onOpen(index)}
      aria-label={label}
    >
      {!loaded && <Skeleton />}
      <img
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0) setLoaded(true);
        }}
        className={`oig-tile__img${loaded ? " oig-tile__img--loaded" : ""}`}
        src={item.src}
        alt={item.alt ?? ""}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
      />
      {item.caption ? (
        <span className="oig-tile__caption">{item.caption}</span>
      ) : null}
      {extra !== undefined ? (
        <span className="oig-tile__more">+{extra}</span>
      ) : null}
    </button>
  );
};

const OverlayGallery = ({
  images,
  variant = "mosaic",
  fitMode = "cover",
  maxTiles = 10,
  fullScreen = false,
  width,
  height,
  showThumbnails = true,
  zoom = true,
  loop = true,
  autoplay = false,
  autoplayInterval = 4000,
  title,
  subtitle,
  actions,
  showFilters = false,
  defaultCategory,
  allLabel = "All",
  className,
  onOpen,
  onClose,
  onIndexChange,
  onFilterChange,
}: OverlayGalleryProps) => {
  const items = useMemo(() => normalizeItems(images), [images]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    items.forEach((item) => {
      if (item.category) seen.add(item.category);
    });
    return Array.from(seen);
  }, [items]);

  const [activeCategory, setActiveCategory] = useState(() =>
    defaultCategory && categories.includes(defaultCategory)
      ? defaultCategory
      : "all"
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visible = useMemo(
    () =>
      activeCategory === "all"
        ? items
        : items.filter((item) => item.category === activeCategory),
    [items, activeCategory]
  );

  const tiles = useMemo(() => visible.slice(0, maxTiles), [visible, maxTiles]);
  const extraCount = visible.length - tiles.length;
  const showFilterBar = showFilters && categories.length >= 2;

  const openLightbox = useCallback(
    (index: number) => {
      setLightboxIndex(index);
      onOpen?.(index);
    },
    [onOpen]
  );

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    onClose?.();
  }, [onClose]);

  const selectCategory = useCallback(
    (category: string) => {
      setActiveCategory(category);
      onFilterChange?.(category);
    },
    [onFilterChange]
  );

  return (
    <section
      className={`oig${className ? ` ${className}` : ""}`}
      style={{
        width: fullScreen ? "100%" : width,
        height: fullScreen ? "100%" : height,
      }}
      aria-label="Image gallery"
    >
      {(title || subtitle || actions) && (
        <header className="oig-header">
          {(title || subtitle) && (
            <div className="oig-header__text">
              {title ? <div className="oig-header__title">{title}</div> : null}
              {subtitle ? (
                <div className="oig-header__subtitle">{subtitle}</div>
              ) : null}
            </div>
          )}
          {actions ? <div className="oig-header__actions">{actions}</div> : null}
        </header>
      )}

      {showFilterBar && (
        <div className="oig-filters" role="group" aria-label="Filter images">
          <button
            type="button"
            className="oig-filter"
            aria-pressed={activeCategory === "all"}
            onClick={() => selectCategory("all")}
          >
            {allLabel}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className="oig-filter"
              aria-pressed={activeCategory === category}
              onClick={() => selectCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <div key={activeCategory} className={`oig-grid oig-grid--${variant}`}>
        {tiles.map((item, index) => (
          <Tile
            key={`${item.src}-${index}`}
            item={item}
            index={index}
            fitMode={fitMode}
            extra={
              extraCount > 0 && index === tiles.length - 1 ? extraCount : undefined
            }
            onOpen={openLightbox}
          />
        ))}
      </div>

      {lightboxIndex !== null && visible.length > 0 && (
        <Lightbox
          images={visible}
          initialIndex={lightboxIndex}
          showThumbnails={showThumbnails}
          zoom={zoom}
          loop={loop}
          autoplay={autoplay}
          autoplayInterval={autoplayInterval}
          onClose={closeLightbox}
          onIndexChange={onIndexChange}
        />
      )}
    </section>
  );
};

export default OverlayGallery;
