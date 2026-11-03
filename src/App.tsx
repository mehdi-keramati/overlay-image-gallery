import React, { useState } from "react";
import { OverlayGallery } from "./index";
import type { GalleryImage, GridVariant } from "./types";
import "./demo.css";

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=70&auto=format&fit=crop`;

const IMAGES: GalleryImage[] = [
  { src: img("1506905925346-21bda4d32df4"), alt: "Snow-capped mountain summit at dusk", caption: "High Summit", category: "Mountains" },
  { src: img("1501594907352-04cda38ebc29"), alt: "Bridge towers glowing in golden hour light", caption: "Golden Hour", category: "Urban" },
  { src: img("1470071459604-3b5ec3a7fe05"), alt: "Fog drifting over a mountain ridge at sunrise", caption: "Fog Ridge", category: "Forest" },
  { src: img("1441974231531-c6227db76b6e"), alt: "Sunbeams falling through a green forest", caption: "Sunlit Forest", category: "Forest" },
  { src: img("1507525428034-b723cf961d3e"), alt: "Soft waves on a tropical shoreline", caption: "Shoreline", category: "Water" },
  { src: img("1519681393784-d120267933ba"), alt: "Mountain range under a starry night sky", caption: "Night Range", category: "Mountains" },
  { src: img("1477959858617-67f85cf4f1df"), alt: "City skyline settling into dusk", caption: "City Lights", category: "Urban" },
  { src: img("1493246507139-91e8fad9978e"), alt: "Still mountain lake reflecting the peaks", caption: "Still Waters", category: "Mountains" },
  { src: img("1472214103451-9374bd1c798e"), alt: "Green field in the first light of day", caption: "First Light", category: "Forest" },
  { src: img("1433086966358-54859d0ed716"), alt: "Water cascading over mossy rocks", caption: "Cascade", category: "Water" },
  { src: img("1501785888041-af3ef285b470"), alt: "Alpine lake glowing at sunset", caption: "Alpine Lake", category: "Mountains" },
  { src: img("1465146344425-f00d5f5c8f07"), alt: "Orange wildflowers in full bloom", caption: "Wildflowers", category: "Forest" },
  { src: img("1447752875215-b2761acb3c5d"), alt: "Mist drifting through tall pines", caption: "Pine Hollow", category: "Forest" },
  { src: img("1439066615861-d1af74d74000"), alt: "Wooden dock reaching into a calm lake", caption: "The Dock", category: "Water" },
  { src: img("1476514525535-07fb3b4ae5f1"), alt: "Canoe gliding across a turquoise lake", caption: "Paddle Out", category: "Water" },
  { src: img("1500530855697-b586d89ba3ee"), alt: "Empty road stretching toward the horizon", caption: "Open Road", category: "Urban" },
];

const VARIANTS: { id: GridVariant; label: string }[] = [
  { id: "mosaic", label: "Mosaic" },
  { id: "featured", label: "Featured" },
  { id: "uniform", label: "Uniform" },
];

const TOGGLES = [
  { key: "autoplay", label: "autoplay" },
  { key: "zoom", label: "zoom" },
  { key: "loop", label: "loop" },
  { key: "showThumbnails", label: "showThumbnails" },
  { key: "showFilters", label: "showFilters" },
] as const;

type ToggleKey = (typeof TOGGLES)[number]["key"];

const App = () => {
  const [variant, setVariant] = useState<GridVariant>("mosaic");
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    autoplay: false,
    zoom: true,
    loop: true,
    showThumbnails: true,
    showFilters: true,
  });

  const toggle = (key: ToggleKey) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="demo">
      <main className="demo__stage">
        <OverlayGallery
          images={IMAGES}
          variant={variant}
          fitMode="cover"
          title={
            <h1 className="demo__title">
              Overlay <span>Image Gallery</span>
            </h1>
          }
          subtitle="A lightweight, animated React gallery — filter the collection, open the lightbox, swipe, pinch."
          actions={
            <div className="demo__controls">
              <div
                className="demo__segment"
                role="radiogroup"
                aria-label="variant prop"
              >
                {VARIANTS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={variant === v.id}
                    className={`demo__segment-btn${
                      variant === v.id ? " demo__segment-btn--active" : ""
                    }`}
                    onClick={() => setVariant(v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              <div className="demo__toggles">
                {TOGGLES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`demo__chip${toggles[t.key] ? " demo__chip--on" : ""}`}
                    aria-pressed={toggles[t.key]}
                    onClick={() => toggle(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          }
          showFilters={toggles.showFilters}
          autoplay={toggles.autoplay}
          zoom={toggles.zoom}
          loop={toggles.loop}
          showThumbnails={toggles.showThumbnails}
          autoplayInterval={3500}
        />
      </main>

      <footer className="demo__hints">
        <span>
          <kbd>←</kbd> <kbd>→</kbd> navigate
        </span>
        <span>
          <kbd>Esc</kbd> close
        </span>
        <span>double-click to zoom</span>
        <span>swipe down to dismiss</span>
        <span>scroll to zoom</span>
      </footer>
    </div>
  );
};

export default App;
