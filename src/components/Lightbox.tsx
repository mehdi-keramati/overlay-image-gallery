import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import type { GalleryImage } from "../types";
import { clamp, fileNameFromUrl, preloadImage } from "../utils";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { Icon } from "./Icon";
import { Skeleton } from "./Skeleton";
import "../styles/base.css";
import "../styles/lightbox.css";

const ENTER_MS = 500;
const EXIT_MS = 260;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const SNAP_RATIO = 0.18;
const FLICK_VELOCITY = 0.4;
const DISMISS_DISTANCE = 110;

type Phase = "enter" | "open" | "exit";

interface LightboxProps {
  images: GalleryImage[];
  initialIndex: number;
  showThumbnails?: boolean;
  zoom?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  autoplayInterval?: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

interface ZoomState {
  scale: number;
  tx: number;
  ty: number;
}

interface DragState {
  active: boolean;
  axis: null | "x" | "y" | "pan";
  startX: number;
  startY: number;
  prevX: number;
  prevY: number;
  dx: number;
  dy: number;
  moved: boolean;
  downClosable: boolean;
  vx: number;
  lastX: number;
  lastT: number;
  pinchStart: number;
  pinchBaseScale: number;
  pointers: Map<number, { x: number; y: number }>;
}

const freshDrag = (): DragState => ({
  active: false,
  axis: null,
  startX: 0,
  startY: 0,
  prevX: 0,
  prevY: 0,
  dx: 0,
  dy: 0,
  moved: false,
  downClosable: true,
  vx: 0,
  lastX: 0,
  lastT: 0,
  pinchStart: 0,
  pinchBaseScale: 1,
  pointers: new Map(),
});

const Lightbox = ({
  images,
  initialIndex,
  showThumbnails = true,
  zoom = true,
  loop = true,
  autoplay = false,
  autoplayInterval = 4000,
  onClose,
  onIndexChange,
}: LightboxProps) => {
  const count = images.length;
  const reducedMotion = usePrefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("enter");
  const [index, setIndex] = useState(() => clamp(initialIndex, 0, count - 1));
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rtl, setRtl] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const zoomRef = useRef<ZoomState>({ scale: 1, tx: 0, ty: 0 });
  const dragRef = useRef<DragState>(freshDrag());
  const indexRef = useRef(index);
  const closedRef = useRef(false);
  const onIndexChangeRef = useRef(onIndexChange);

  indexRef.current = index;
  onIndexChangeRef.current = onIndexChange;

  useBodyScrollLock(phase !== "exit");
  useFocusTrap(rootRef, phase !== "exit");

  const activeImage = useCallback((): HTMLImageElement | null => {
    const slide = trackRef.current?.children[indexRef.current];
    return slide ? slide.querySelector("img") : null;
  }, []);

  const applyZoom = useCallback(() => {
    const img = activeImage();
    if (!img) return;
    const { scale: s, tx, ty } = zoomRef.current;
    if (s > 1.01) {
      img.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    } else {
      img.style.transform = "";
    }
  }, [activeImage]);

  const clampZoom = useCallback(
    (img: HTMLImageElement) => {
      const z = zoomRef.current;
      if (z.scale <= 1.01) {
        z.tx = 0;
        z.ty = 0;
        return;
      }
      const maxX = ((z.scale - 1) * img.offsetWidth) / 2;
      const maxY = ((z.scale - 1) * img.offsetHeight) / 2;
      z.tx = clamp(z.tx, -maxX, maxX);
      z.ty = clamp(z.ty, -maxY, maxY);
    },
    []
  );

  const zoomAt = useCallback(
    (clientX: number, clientY: number, nextScale: number) => {
      const img = activeImage();
      if (!img) return;
      const { scale: s0, tx: tx0, ty: ty0 } = zoomRef.current;
      const s1 = clamp(nextScale, 1, MAX_SCALE);
      if (Math.abs(s1 - s0) < 0.001) return;
      const rect = img.getBoundingClientRect();
      const centerLx = rect.left + rect.width / 2 - tx0;
      const centerLy = rect.top + rect.height / 2 - ty0;
      const ux = (clientX - centerLx) / s0;
      const uy = (clientY - centerLy) / s0;
      const z: ZoomState = {
        scale: s1,
        tx: s1 > 1.01 ? tx0 - ux * (s1 - s0) : 0,
        ty: s1 > 1.01 ? ty0 - uy * (s1 - s0) : 0,
      };
      zoomRef.current = z;
      clampZoom(img);
      setScale(zoomRef.current.scale);
      applyZoom();
    },
    [activeImage, applyZoom, clampZoom]
  );

  const resetZoom = useCallback(() => {
    zoomRef.current = { scale: 1, tx: 0, ty: 0 };
    setScale(1);
    const img = activeImage();
    if (img) img.style.transform = "";
  }, [activeImage]);

  const toggleZoomAtCenter = useCallback(() => {
    const img = activeImage();
    if (!img) return;
    if (zoomRef.current.scale > 1.01) {
      resetZoom();
      return;
    }
    const rect = img.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, DOUBLE_TAP_SCALE);
  }, [activeImage, resetZoom, zoomAt]);

  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        if (count === 0) return i;
        const next = i + dir;
        if (next < 0) return loop ? count - 1 : 0;
        if (next > count - 1) return loop ? 0 : count - 1;
        return next;
      });
    },
    [count, loop]
  );

  const requestClose = useCallback(() => {
    if (closedRef.current) return;
    setPhase((p) => (p === "exit" ? p : "exit"));
  }, []);

  useEffect(() => {
    if (phase === "enter") {
      const t = window.setTimeout(() => setPhase("open"), reducedMotion ? 0 : ENTER_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === "exit") {
      const t = window.setTimeout(() => {
        if (!closedRef.current) {
          closedRef.current = true;
          onClose();
        }
      }, reducedMotion ? 0 : EXIT_MS);
      return () => window.clearTimeout(t);
    }
  }, [phase, reducedMotion, onClose]);

  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = rootRef.current?.closest("[dir]");
    setRtl(el?.getAttribute("dir") === "rtl");
  }, []);

  useEffect(() => {
    if (phase === "exit") return;
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          requestClose();
          break;
        case "ArrowLeft":
          rtl ? go(1) : go(-1);
          break;
        case "ArrowRight":
          rtl ? go(-1) : go(1);
          break;
        case "Home":
          if (!loop) setIndex(0);
          break;
        case "End":
          if (!loop) setIndex(count - 1);
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [phase, rtl, loop, count, go, requestClose]);

  useEffect(() => {
    setIndex((i) => clamp(i, 0, Math.max(0, count - 1)));
  }, [count]);

  useEffect(() => {
    resetZoom();
  }, [index, resetZoom]);

  useEffect(() => {
    if (closedRef.current) return;
    onIndexChangeRef.current?.(index);
    const sources = [
      images[(index + 1) % count]?.src,
      images[(index - 1 + count) % count]?.src,
    ];
    sources.forEach((src) => {
      if (src) preloadImage(src).catch(() => undefined);
    });
  }, [index, images, count]);

  useEffect(() => {
    const strip = thumbsRef.current;
    const active = strip?.querySelector('[aria-current="true"]');
    active?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [index, reducedMotion]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !zoom) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
      zoomAt(event.clientX, event.clientY, zoomRef.current.scale * factor);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoom, zoomAt]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      rootRef.current?.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const d = dragRef.current;
    d.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setPaused(true);
    if (d.pointers.size === 2) {
      const [a, b] = Array.from(d.pointers.values());
      d.pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      d.pinchBaseScale = zoomRef.current.scale;
      d.axis = null;
      return;
    }
    if (d.pointers.size > 2) return;
    d.active = true;
    d.axis = zoomRef.current.scale > 1.01 ? "pan" : null;
    d.startX = event.clientX;
    d.startY = event.clientY;
    d.prevX = event.clientX;
    d.prevY = event.clientY;
    d.dx = 0;
    d.dy = 0;
    d.moved = false;
    d.vx = 0;
    d.lastX = event.clientX;
    d.lastT = event.timeStamp;
    d.downClosable = !(event.target as HTMLElement).closest("img, button, a");
    if (!d.downClosable) {
      // Capturing the pointer here would retarget the derived click to the
      // stage and swallow the control's own click.
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.pointers.has(event.pointerId)) return;
    d.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (d.pointers.size >= 2 && d.pinchStart > 0) {
      const [a, b] = Array.from(d.pointers.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 0 && zoom) {
        zoomAt(
          (a.x + b.x) / 2,
          (a.y + b.y) / 2,
          d.pinchBaseScale * (dist / d.pinchStart)
        );
      }
      return;
    }

    if (!d.active) return;
    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;

    if (d.axis === "pan") {
      const img = activeImage();
      if (img) {
        zoomRef.current.tx += event.clientX - d.prevX;
        zoomRef.current.ty += event.clientY - d.prevY;
        clampZoom(img);
        applyZoom();
      }
      d.prevX = event.clientX;
      d.prevY = event.clientY;
      d.moved = true;
      return;
    }

    if (!d.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    d.moved = true;

    const track = trackRef.current;
    if (d.axis === "x" && track) {
      let effective = dx;
      const atStart = index === 0 && dx > 0;
      const atEnd = index === count - 1 && dx < 0;
      if (!loop && (atStart || atEnd)) effective = dx * 0.3;
      track.classList.add("oig-lb__track--drag");
      track.style.transform = `translate3d(${
        -index * track.offsetWidth + effective
      }px, 0, 0)`;
      d.dx = dx;
      const dt = event.timeStamp - d.lastT;
      if (dt > 0) {
        d.vx = d.vx * 0.8 + ((event.clientX - d.lastX) / dt) * 0.2;
        d.lastX = event.clientX;
        d.lastT = event.timeStamp;
      }
    } else if (d.axis === "y" && rootRef.current) {
      const progress = clamp(dy / 320, 0, 1);
      rootRef.current.style.transform = `translateY(${dy}px) scale(${
        1 - progress * 0.08
      })`;
      rootRef.current.style.opacity = `${1 - progress * 0.7}`;
      d.dy = dy;
    }
  };

  const settleRoot = () => {
    const root = rootRef.current;
    if (!root) return;
    root.style.transition = "transform 320ms var(--oig-ease), opacity 320ms var(--oig-ease)";
    root.style.transform = "";
    root.style.opacity = "";
    window.setTimeout(() => {
      root.style.transition = "";
    }, 340);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    d.pointers.delete(event.pointerId);
    if (d.pointers.size < 2) d.pinchStart = 0;
    if (d.pointers.size > 0) {
      if (d.pointers.size === 1) {
        const [p] = Array.from(d.pointers.values());
        d.active = true;
        d.axis = zoomRef.current.scale > 1.01 ? "pan" : null;
        d.startX = d.prevX = p.x;
        d.startY = d.prevY = p.y;
        d.dx = 0;
        d.dy = 0;
      }
      return;
    }
    setPaused(false);
    if (!d.active) return;
    d.active = false;

    const track = trackRef.current;
    if (d.axis === "x" && track) {
      track.classList.remove("oig-lb__track--drag");
      const width = track.offsetWidth || 1;
      const commitDir =
        d.dx < -width * SNAP_RATIO || (d.dx < -30 && d.vx < -FLICK_VELOCITY)
          ? 1
          : d.dx > width * SNAP_RATIO || (d.dx > 30 && d.vx > FLICK_VELOCITY)
            ? -1
            : 0;
      let next = index;
      if (commitDir === 1 && (loop || index < count - 1)) {
        next = index + 1 < count ? index + 1 : 0;
      } else if (commitDir === -1 && (loop || index > 0)) {
        next = index - 1 >= 0 ? index - 1 : count - 1;
      }
      void track.offsetWidth;
      track.style.transform = `translate3d(${-next * width}px, 0, 0)`;
      if (next !== index) setIndex(next);
    } else if (d.axis === "y") {
      if (Math.abs(d.dy) > DISMISS_DISTANCE) {
        requestClose();
      } else {
        settleRoot();
      }
    }
  };

  const onStageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    if (!dragRef.current.downClosable) return;
    const target = event.target as HTMLElement;
    if (target.closest("img, button, a")) return;
    requestClose();
  };

  const onStageDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!zoom) return;
    const target = event.target as HTMLElement;
    if (!target.closest("img")) return;
    if (zoomRef.current.scale > 1.01) {
      resetZoom();
    } else {
      zoomAt(event.clientX, event.clientY, DOUBLE_TAP_SCALE);
    }
  };

  if (count === 0) return null;

  const current = images[index];
  const zoomed = scale > 1.01;
  const autoplayActive = autoplay && phase !== "exit" && !paused && !zoomed;

  return createPortal(
    <div
      ref={rootRef}
      className={`oig oig-lb oig-lb--${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label={current?.alt || current?.caption || "Image viewer"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="oig-lb__veil" onClick={requestClose} />

      {autoplay && phase !== "exit" && (
        <div
          key={index}
          className={`oig-lb__progress${
            autoplayActive ? "" : " oig-lb__progress--paused"
          }`}
          style={{ animationDuration: `${autoplayInterval}ms` }}
          onAnimationEnd={() => go(1)}
          aria-hidden="true"
        />
      )}

      <header className="oig-lb__bar">
        <div className="oig-lb__count" aria-live="polite">
          <span key={index} className="oig-lb__count-current">
            {index + 1}
          </span>
          <span aria-hidden="true">/</span>
          <span>{count}</span>
        </div>

        {zoom && (
          <button
            type="button"
            className="oig-lb__btn"
            onClick={toggleZoomAtCenter}
            aria-label={zoomed ? "Zoom out" : "Zoom in"}
          >
            <Icon name={zoomed ? "zoomOut" : "zoomIn"} />
          </button>
        )}
        <button
          type="button"
          className="oig-lb__btn"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          <Icon name={isFullscreen ? "collapse" : "expand"} />
        </button>
        <a
          className="oig-lb__btn"
          href={current?.src}
          download={fileNameFromUrl(current?.src ?? "")}
          target="_blank"
          rel="noreferrer"
          aria-label="Download image"
        >
          <Icon name="download" />
        </a>
        <button
          type="button"
          ref={closeBtnRef}
          className="oig-lb__btn"
          onClick={requestClose}
          aria-label="Close viewer"
        >
          <Icon name="close" />
        </button>
      </header>

      <div
        ref={stageRef}
        className="oig-lb__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onStageClick}
        onDoubleClick={onStageDoubleClick}
      >
        <button
          type="button"
          className="oig-lb__btn oig-lb__nav oig-lb__nav--prev"
          onClick={() => go(-1)}
          disabled={!loop && index === 0}
          aria-label="Previous image"
        >
          <Icon name="prev" size={22} />
        </button>

        <div
          ref={trackRef}
          className="oig-lb__track"
          style={
            { transform: `translate3d(${-index * 100}%, 0, 0)` } as CSSProperties
          }
        >
          {images.map((item, i) => (
            <div
              className="oig-lb__slide"
              key={`${item.src}-${i}`}
              aria-hidden={i !== index}
            >
              <figure className="oig-lb__figure">
                {!loaded.has(item.src) && <Skeleton />}
                <img
                  src={item.src}
                  alt={item.alt ?? ""}
                  className={`oig-lb__img${
                    loaded.has(item.src) ? " oig-lb__img--loaded" : ""
                  }${zoom ? (zoomed ? " oig-lb__img--pan" : " oig-lb__img--zoomable") : ""}`}
                  loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  onLoad={() =>
                    setLoaded((prev) => new Set(prev).add(item.src))
                  }
                />
                <figcaption className="oig-visually-hidden">
                  {item.caption ?? item.alt ?? `Image ${i + 1} of ${count}`}
                </figcaption>
              </figure>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="oig-lb__btn oig-lb__nav oig-lb__nav--next"
          onClick={() => go(1)}
          disabled={!loop && index === count - 1}
          aria-label="Next image"
        >
          <Icon name="next" size={22} />
        </button>
      </div>

      <footer className="oig-lb__foot">
        <p key={index} className="oig-lb__caption">
          {current?.caption}
        </p>
        {showThumbnails && (
          <div
            ref={thumbsRef}
            className="oig-lb__thumbs"
            role="tablist"
            aria-label="Go to image"
          >
            {images.map((item, i) => (
              <button
                key={`${item.src}-thumb-${i}`}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-current={i === index}
                aria-label={`Image ${i + 1}`}
                tabIndex={-1}
                className="oig-lb__thumb"
                onClick={() => setIndex(i)}
              >
                <img
                  src={item.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>,
    document.body
  );
};

export default Lightbox;
