# Overlay Image Gallery

[![npm version](https://badge.fury.io/js/overlay-image-gallery.svg)](https://badge.fury.io/js/overlay-image-gallery)
[![Download Count](http://img.shields.io/npm/dm/overlay-image-gallery.svg?style=flat)](https://www.npmjs.com/package/overlay-image-gallery)
[![Bundle size](https://badgen.net/bundlephobia/minzip/overlay-image-gallery)](https://bundlephobia.com/package/overlay-image-gallery)

###### A lightweight, animated React image gallery with a full-featured lightbox — zero runtime dependencies beyond React.

## Highlights

- **Three grid variants** — `mosaic`, `featured`, `uniform` — with staggered entrance animations, hover shine and caption reveals.
- **Cinematic lightbox** — blurred veil, spring-eased transitions, portal rendering, exit animations.
- **Fluid gestures** — 1:1 drag-to-swipe with velocity snapping, swipe-down-to-dismiss, edge resistance.
- **Zoom** — double-click/double-tap, pinch on touch, scroll-wheel zoom, pan with clamping.
- **Keyboard accessible** — `←`/`→` navigate, `Esc` closes, `Home`/`End` jump, focus is trapped and restored.
- **Thumbnails** — auto-scrolling strip with active indicator.
- **Fullscreen & download** buttons, animated autoplay progress bar, image captions.
- **Lightweight** — no animation or slider libraries; CSS transforms and pointer events only.
- **Theming** — every color, radius and easing is a `--oig-*` CSS custom property.
- **Respectful** — `prefers-reduced-motion` supported, lazy loading, SSR-safe.

[`Live Demo`](https://b-owl.github.io/overlay-image-gallery/)

## Installation

```bash
npm install overlay-image-gallery
```

###### Or

```bash
yarn add overlay-image-gallery
```

## Usage

```jsx
import { OverlayGallery } from "overlay-image-gallery";

const App = () => {
  const images = [
    { src: "https://example.com/beach.jpg", alt: "A beach", caption: "Beach day", category: "Nature" },
    { src: "https://example.com/forest.jpg", alt: "A forest", caption: "Pine hollow", category: "Nature" },
    { src: "https://example.com/tower.jpg", alt: "A skyline", caption: "Downtown", category: "City" },
    "https://example.com/road.jpg", // plain URLs work too
  ];

  return (
    <OverlayGallery
      images={images}
      variant="mosaic"
      fitMode="cover"
      title="Travel journal"
      subtitle="Two weeks on the road, in fifteen frames."
      showFilters
    />
  );
};

export default App;
```

The component ships **zero chrome**: a header and category filter bar are rendered
only when you pass `title`/`subtitle`/`showFilters`. Everything on screen is a prop.

## Props

| Prop                | Type                      | Default     | Description                                                       |
| ------------------- | ------------------------- | ----------- | ----------------------------------------------------------------- |
| `images`            | `Array<string \| object>` | —           | **(Required)** Image URLs or `{ src, alt, caption, category }` objects. |
| `variant`           | `"mosaic" \| "featured" \| "uniform"` | `"mosaic"` | Grid layout style.                                           |
| `fitMode`           | `"contain" \| "cover" \| "fill" \| "none" \| "scale-down"` | `"cover"` | CSS `object-fit` for grid tiles.               |
| `maxTiles`          | Number                    | `10`        | Maximum tiles shown before a `+N` overlay appears.                |
| `fullScreen`        | Boolean                   | `false`     | Stretch the grid to fill its container.                           |
| `width` / `height`  | Number (px)               | —           | Fixed grid size when not full-screen.                             |
| `title`             | `ReactNode`               | —           | Header heading above the grid; renders only when provided.        |
| `subtitle`          | `ReactNode`               | —           | Header line under the title; renders only when provided.          |
| `actions`           | `ReactNode`               | —           | Slot beside the header (buttons, links); renders only when provided. |
| `showFilters`       | Boolean                   | `false`     | Show category filter chips (needs ≥ 2 distinct `category` values). |
| `defaultCategory`   | String                    | `"all"`     | Category selected initially.                                      |
| `allLabel`          | String                    | `"All"`     | Label of the "show everything" chip (for i18n).                   |
| `showThumbnails`    | Boolean                   | `true`      | Show the thumbnail strip inside the lightbox.                     |
| `zoom`              | Boolean                   | `true`      | Enable zoom gestures and the zoom button.                         |
| `loop`              | Boolean                   | `true`      | Wrap navigation at both ends.                                     |
| `autoplay`          | Boolean                   | `false`     | Advance automatically with a progress bar.                        |
| `autoplayInterval`  | Number (ms)               | `4000`      | Time per slide when autoplay is on.                               |
| `className`         | String                    | —           | Extra class on the root element.                                  |
| `onOpen`            | `(index) => void`         | —           | Fired when the lightbox opens.                                    |
| `onClose`           | `() => void`              | —           | Fired when the lightbox closes.                                   |
| `onIndexChange`     | `(index) => void`         | —           | Fired when the active image changes.                              |
| `onFilterChange`    | `(category) => void`      | —           | Fired when a category filter is selected.                         |

## Theming

Override the CSS custom properties on any ancestor (or the root `.oig` element):

```css
.my-gallery {
  --oig-accent: #e0653a;
  --oig-radius: 20px;
  --oig-gap: 12px;
}
```

| Token              | Purpose                                |
| ------------------ | -------------------------------------- |
| `--oig-accent`     | Accent color (focus rings, progress)   |
| `--oig-veil`       | Lightbox backdrop color                |
| `--oig-radius`     | Tile and image corner radius           |
| `--oig-gap`        | Grid gap                               |
| `--oig-ease`       | Signature easing curve                 |
| `--oig-shadow`     | Image shadow inside the lightbox       |

## Accessibility

The gallery ships with WCAG-minded defaults: tiles are real buttons, the lightbox is a
labelled `role="dialog"` with `aria-modal`, focus is trapped while open and restored on
close, the counter is announced via `aria-live`, and every animation collapses under
`prefers-reduced-motion: reduce`.

## Running Locally

```
git clone https://github.com/b-owl/overlay-image-gallery.git
cd overlay-image-gallery
npm install
npm run dev
```

Then open [`localhost:3000`](http://localhost:3000) in a browser.

## Contributing

We welcome contributions! When making a pull request, please focus on a specific issue. Avoid combining multiple changes in one PR. Describe your feature or implementation clearly. For major changes or if you're unsure about the usefulness of a change, please open an issue first to discuss it.

- Follow eslint provided
- Write [clean](https://github.com/ryanmcdermott/clean-code-javascript) code

## License

This project is licensed under the MIT License.
