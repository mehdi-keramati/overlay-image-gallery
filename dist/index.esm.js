import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

const normalizeItems = (items) => items.map((item) => (typeof item === "string" ? { src: item } : item));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const preloadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
});
const fileNameFromUrl = (url) => {
    try {
        const { pathname } = new URL(url, "https://overlay.gallery");
        return pathname.split("/").pop() || "image";
    }
    catch (_a) {
        return "image";
    }
};

const useBodyScrollLock = (active) => {
    useEffect(() => {
        if (!active)
            return;
        const { overflow, paddingRight } = document.body.style;
        const scrollbar = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = "hidden";
        if (scrollbar > 0)
            document.body.style.paddingRight = `${scrollbar}px`;
        return () => {
            document.body.style.overflow = overflow;
            document.body.style.paddingRight = paddingRight;
        };
    }, [active]);
};

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
const useFocusTrap = (ref, active) => {
    useEffect(() => {
        var _a;
        const node = ref.current;
        if (!active || !node)
            return;
        const previous = document.activeElement;
        const focusables = () => Array.from(node.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        (_a = focusables()[0]) === null || _a === void 0 ? void 0 : _a.focus();
        const onKeyDown = (event) => {
            if (event.key !== "Tab")
                return;
            const list = focusables();
            if (list.length === 0)
                return;
            const first = list[0];
            const last = list[list.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        node.addEventListener("keydown", onKeyDown);
        return () => {
            node.removeEventListener("keydown", onKeyDown);
            previous === null || previous === void 0 ? void 0 : previous.focus();
        };
    }, [ref, active]);
};

const usePrefersReducedMotion = () => {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setReduced(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    return reduced;
};

const GLYPHS = {
    close: (React.createElement(React.Fragment, null,
        React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
        React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" }))),
    prev: React.createElement("polyline", { points: "15 18 9 12 15 6" }),
    next: React.createElement("polyline", { points: "9 18 15 12 9 6" }),
    expand: (React.createElement(React.Fragment, null,
        React.createElement("path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }),
        React.createElement("path", { d: "M16 3h3a2 2 0 0 1 2 2v3" }),
        React.createElement("path", { d: "M8 21H5a2 2 0 0 1-2-2v-3" }),
        React.createElement("path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" }))),
    collapse: (React.createElement(React.Fragment, null,
        React.createElement("path", { d: "M8 3v3a2 2 0 0 1-2 2H3" }),
        React.createElement("path", { d: "M21 8h-3a2 2 0 0 1-2-2V3" }),
        React.createElement("path", { d: "M3 16h3a2 2 0 0 1 2 2v3" }),
        React.createElement("path", { d: "M16 21v-3a2 2 0 0 1 2-2h3" }))),
    download: (React.createElement(React.Fragment, null,
        React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
        React.createElement("polyline", { points: "7 10 12 15 17 10" }),
        React.createElement("line", { x1: "12", y1: "15", x2: "12", y2: "3" }))),
    zoomIn: (React.createElement(React.Fragment, null,
        React.createElement("circle", { cx: "11", cy: "11", r: "8" }),
        React.createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
        React.createElement("line", { x1: "11", y1: "8", x2: "11", y2: "14" }),
        React.createElement("line", { x1: "8", y1: "11", x2: "14", y2: "11" }))),
    zoomOut: (React.createElement(React.Fragment, null,
        React.createElement("circle", { cx: "11", cy: "11", r: "8" }),
        React.createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
        React.createElement("line", { x1: "8", y1: "11", x2: "14", y2: "11" }))),
};
const Icon = ({ name, size = 20 }) => (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, GLYPHS[name]));

const Skeleton = ({ className }) => (React.createElement("div", { className: `oig-skeleton${className ? ` ${className}` : ""}`, "aria-hidden": "true" }));

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (!css || typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z$2 = ".oig {\n  --oig-accent: #5b5bd6;\n  --oig-fg: #ffffff;\n  --oig-fg-muted: rgba(255, 255, 255, 0.64);\n  --oig-surface: rgba(255, 255, 255, 0.09);\n  --oig-surface-strong: rgba(255, 255, 255, 0.17);\n  --oig-border: rgba(255, 255, 255, 0.14);\n  --oig-veil: rgba(11, 11, 17, 0.82);\n  --oig-radius: 14px;\n  --oig-radius-sm: 10px;\n  --oig-gap: 8px;\n  --oig-ease: cubic-bezier(0.22, 1, 0.36, 1);\n  --oig-ease-inout: cubic-bezier(0.65, 0, 0.35, 1);\n  --oig-shadow: 0 32px 90px -18px rgba(0, 0, 0, 0.6);\n  --oig-font: ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto,\n    \"Helvetica Neue\", Arial, sans-serif;\n\n  font-family: var(--oig-font);\n  line-height: 1.4;\n  -webkit-font-smoothing: antialiased;\n  text-rendering: optimizeLegibility;\n}\n\n.oig,\n.oig *,\n.oig *::before,\n.oig *::after {\n  box-sizing: border-box;\n}\n\n.oig img {\n  display: block;\n  max-width: 100%;\n}\n\n.oig :where(button) {\n  font: inherit;\n  line-height: inherit;\n  color: inherit;\n  background: none;\n  border: 0;\n  padding: 0;\n  cursor: pointer;\n}\n\n.oig :where(a) {\n  color: inherit;\n}\n\n.oig :focus-visible {\n  outline: 2px solid var(--oig-accent);\n  outline-offset: 2px;\n}\n\n.oig-skeleton {\n  position: absolute;\n  inset: 0;\n  border-radius: inherit;\n  background: linear-gradient(\n    100deg,\n    rgba(255, 255, 255, 0.05) 40%,\n    rgba(255, 255, 255, 0.13) 50%,\n    rgba(255, 255, 255, 0.05) 60%\n  );\n  background-size: 200% 100%;\n  animation: oig-shimmer 1.4s linear infinite;\n}\n\n@keyframes oig-shimmer {\n  from {\n    background-position: 200% 0;\n  }\n  to {\n    background-position: -200% 0;\n  }\n}\n\n.oig-visually-hidden {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  margin: -1px;\n  padding: 0;\n  overflow: hidden;\n  clip: rect(0 0 0 0);\n  white-space: nowrap;\n  border: 0;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .oig *,\n  .oig *::before,\n  .oig *::after {\n    animation-duration: 0.001ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.001ms !important;\n    scroll-behavior: auto !important;\n  }\n}\n";
styleInject(css_248z$2);

var css_248z$1 = ".oig-lb {\n  position: fixed;\n  inset: 0;\n  z-index: 9999;\n  display: flex;\n  flex-direction: column;\n  color: var(--oig-fg);\n}\n\n.oig-lb__veil {\n  position: absolute;\n  inset: 0;\n  background: var(--oig-veil);\n  backdrop-filter: blur(22px) saturate(1.25);\n  -webkit-backdrop-filter: blur(22px) saturate(1.25);\n}\n\n.oig-lb__progress {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  height: 3px;\n  z-index: 5;\n  background: linear-gradient(\n    90deg,\n    var(--oig-accent),\n    color-mix(in srgb, var(--oig-accent) 55%, white)\n  );\n  transform-origin: left;\n  animation: oig-lb-progress linear both;\n}\n\n.oig-lb__progress--paused {\n  animation-play-state: paused;\n}\n\n@keyframes oig-lb-progress {\n  from {\n    transform: scaleX(0);\n  }\n  to {\n    transform: scaleX(1);\n  }\n}\n\n.oig-lb__bar {\n  position: relative;\n  z-index: 3;\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 14px 18px;\n}\n\n.oig-lb__count {\n  display: flex;\n  align-items: baseline;\n  gap: 5px;\n  margin-right: auto;\n  min-width: 64px;\n  padding: 7px 14px;\n  border-radius: 999px;\n  background: var(--oig-surface);\n  border: 1px solid var(--oig-border);\n  font-size: 0.82rem;\n  font-weight: 600;\n  font-variant-numeric: tabular-nums;\n  letter-spacing: 0.02em;\n  backdrop-filter: blur(12px);\n  -webkit-backdrop-filter: blur(12px);\n}\n\n.oig-lb__count-current {\n  display: inline-block;\n  animation: oig-lb-num 260ms var(--oig-ease);\n}\n\n@keyframes oig-lb-num {\n  from {\n    opacity: 0;\n    transform: translateY(7px);\n  }\n}\n\n.oig-lb__btn {\n  display: grid;\n  place-items: center;\n  width: 40px;\n  height: 40px;\n  border-radius: 999px;\n  background: var(--oig-surface);\n  border: 1px solid var(--oig-border);\n  color: var(--oig-fg);\n  backdrop-filter: blur(12px);\n  -webkit-backdrop-filter: blur(12px);\n  transition: transform 200ms var(--oig-ease), background 200ms var(--oig-ease),\n    opacity 200ms var(--oig-ease);\n}\n\n.oig-lb__btn:hover {\n  background: var(--oig-surface-strong);\n  transform: scale(1.07);\n}\n\n.oig-lb__btn:active {\n  transform: scale(0.92);\n}\n\n.oig-lb__btn[disabled] {\n  opacity: 0.35;\n  cursor: default;\n  transform: none;\n  background: var(--oig-surface);\n}\n\n.oig-lb__stage {\n  position: relative;\n  z-index: 1;\n  flex: 1;\n  min-height: 0;\n  overflow: hidden;\n  touch-action: none;\n}\n\n.oig-lb__track {\n  display: flex;\n  height: 100%;\n  transition: transform 500ms var(--oig-ease);\n  will-change: transform;\n}\n\n.oig-lb__track--drag {\n  transition: none;\n}\n\n.oig-lb__slide {\n  flex: 0 0 100%;\n  min-width: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 8px clamp(16px, 6vw, 76px);\n}\n\n.oig-lb__figure {\n  position: relative;\n  display: flex;\n  max-width: 100%;\n  max-height: 100%;\n  margin: 0;\n}\n\n.oig-lb__figure:has(> .oig-lb__img:not(.oig-lb__img--loaded)) {\n  min-width: min(58vw, 460px);\n  min-height: min(44vh, 330px);\n}\n\n.oig-lb__figure .oig-skeleton {\n  border-radius: var(--oig-radius-sm);\n}\n\n.oig-lb__img {\n  max-width: 100%;\n  max-height: 100%;\n  object-fit: contain;\n  border-radius: var(--oig-radius-sm);\n  box-shadow: var(--oig-shadow);\n  opacity: 0;\n  transition: opacity 350ms var(--oig-ease);\n  user-select: none;\n  -webkit-user-select: none;\n  -webkit-user-drag: none;\n  will-change: transform;\n}\n\n.oig-lb__img--loaded {\n  opacity: 1;\n}\n\n.oig-lb__img--zoomable {\n  cursor: zoom-in;\n}\n\n.oig-lb__img--pan {\n  cursor: grab;\n}\n\n.oig-lb__img--pan:active {\n  cursor: grabbing;\n}\n\n.oig-lb__nav {\n  position: absolute;\n  z-index: 4;\n  top: 50%;\n  width: 48px;\n  height: 48px;\n  transform: translateY(-50%);\n}\n\n.oig-lb__nav:hover {\n  transform: translateY(-50%) scale(1.07);\n}\n\n.oig-lb__nav:active {\n  transform: translateY(-50%) scale(0.92);\n}\n\n.oig-lb__nav[disabled] {\n  transform: translateY(-50%);\n}\n\n.oig-lb__nav--prev {\n  left: 18px;\n}\n\n.oig-lb__nav--next {\n  right: 18px;\n}\n\n.oig-lb__foot {\n  position: relative;\n  z-index: 3;\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  padding: 8px 18px calc(16px + env(safe-area-inset-bottom, 0px));\n}\n\n.oig-lb__caption {\n  margin: 0;\n  min-height: 1.25em;\n  font-size: 0.85rem;\n  text-align: center;\n  color: var(--oig-fg-muted);\n  animation: oig-lb-cap 300ms var(--oig-ease);\n}\n\n.oig-lb__caption:empty {\n  display: none;\n}\n\n@keyframes oig-lb-cap {\n  from {\n    opacity: 0;\n    transform: translateY(5px);\n  }\n}\n\n.oig-lb__thumbs {\n  display: flex;\n  gap: 8px;\n  align-self: center;\n  max-width: 100%;\n  padding: 6px 4px;\n  overflow-x: auto;\n  scrollbar-width: none;\n  mask-image: linear-gradient(\n    90deg,\n    transparent,\n    #000 22px,\n    #000 calc(100% - 22px),\n    transparent\n  );\n  -webkit-mask-image: linear-gradient(\n    90deg,\n    transparent,\n    #000 22px,\n    #000 calc(100% - 22px),\n    transparent\n  );\n}\n\n.oig-lb__thumbs::-webkit-scrollbar {\n  display: none;\n}\n\n.oig-lb__thumb {\n  flex: 0 0 auto;\n  width: 76px;\n  aspect-ratio: 16 / 10;\n  border-radius: 8px;\n  overflow: hidden;\n  opacity: 0.4;\n  outline: 2px solid transparent;\n  outline-offset: 2px;\n  transition: opacity 250ms var(--oig-ease), outline-color 250ms var(--oig-ease),\n    transform 250ms var(--oig-ease);\n}\n\n.oig-lb__thumb img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n\n.oig-lb__thumb:hover {\n  opacity: 0.78;\n}\n\n.oig-lb__thumb[aria-current=\"true\"] {\n  opacity: 1;\n  outline-color: var(--oig-accent);\n  transform: translateY(-2px);\n}\n\n.oig-lb--enter .oig-lb__veil {\n  animation: oig-lb-fade 360ms var(--oig-ease) both;\n}\n\n.oig-lb--enter .oig-lb__bar {\n  animation: oig-lb-bar-in 420ms var(--oig-ease) both;\n}\n\n.oig-lb--enter .oig-lb__stage {\n  animation: oig-lb-stage-in 460ms var(--oig-ease) both;\n}\n\n.oig-lb--enter .oig-lb__foot {\n  animation: oig-lb-foot-in 460ms var(--oig-ease) both;\n}\n\n@keyframes oig-lb-fade {\n  from {\n    opacity: 0;\n  }\n}\n\n@keyframes oig-lb-bar-in {\n  from {\n    opacity: 0;\n    transform: translateY(-14px);\n  }\n}\n\n@keyframes oig-lb-stage-in {\n  from {\n    opacity: 0;\n    transform: scale(0.955);\n  }\n}\n\n@keyframes oig-lb-foot-in {\n  from {\n    opacity: 0;\n    transform: translateY(14px);\n  }\n}\n\n.oig-lb--exit .oig-lb__veil {\n  animation: oig-lb-fade-out 240ms var(--oig-ease-inout) both;\n}\n\n.oig-lb--exit .oig-lb__bar {\n  animation: oig-lb-bar-out 240ms var(--oig-ease-inout) both;\n}\n\n.oig-lb--exit .oig-lb__stage {\n  animation: oig-lb-stage-out 240ms var(--oig-ease-inout) both;\n}\n\n.oig-lb--exit .oig-lb__foot {\n  animation: oig-lb-foot-out 240ms var(--oig-ease-inout) both;\n}\n\n@keyframes oig-lb-fade-out {\n  to {\n    opacity: 0;\n  }\n}\n\n@keyframes oig-lb-bar-out {\n  to {\n    opacity: 0;\n    transform: translateY(-10px);\n  }\n}\n\n@keyframes oig-lb-stage-out {\n  to {\n    opacity: 0;\n    transform: scale(0.96);\n  }\n}\n\n@keyframes oig-lb-foot-out {\n  to {\n    opacity: 0;\n    transform: translateY(10px);\n  }\n}\n\n@media (max-width: 640px) {\n  .oig-lb__nav {\n    display: none;\n  }\n\n  .oig-lb__bar {\n    padding: 10px 12px;\n  }\n\n  .oig-lb__btn {\n    width: 36px;\n    height: 36px;\n  }\n\n  .oig-lb__count {\n    font-size: 0.74rem;\n    padding: 5px 11px;\n    min-width: 0;\n  }\n\n  .oig-lb__slide {\n    padding: 8px;\n  }\n\n  .oig-lb__thumb {\n    width: 58px;\n  }\n\n  .oig-lb__foot {\n    padding: 6px 12px calc(12px + env(safe-area-inset-bottom, 0px));\n  }\n}\n";
styleInject(css_248z$1);

const ENTER_MS = 500;
const EXIT_MS = 260;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const SNAP_RATIO = 0.18;
const FLICK_VELOCITY = 0.4;
const DISMISS_DISTANCE = 110;
const freshDrag = () => ({
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
const Lightbox = ({ images, initialIndex, showThumbnails = true, zoom = true, loop = true, autoplay = false, autoplayInterval = 4000, onClose, onIndexChange, }) => {
    var _a;
    const count = images.length;
    const reducedMotion = usePrefersReducedMotion();
    const [phase, setPhase] = useState("enter");
    const [index, setIndex] = useState(() => clamp(initialIndex, 0, count - 1));
    const [loaded, setLoaded] = useState(() => new Set());
    const [scale, setScale] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [paused, setPaused] = useState(false);
    const [rtl, setRtl] = useState(false);
    const rootRef = useRef(null);
    const stageRef = useRef(null);
    const trackRef = useRef(null);
    const thumbsRef = useRef(null);
    const closeBtnRef = useRef(null);
    const zoomRef = useRef({ scale: 1, tx: 0, ty: 0 });
    const dragRef = useRef(freshDrag());
    const indexRef = useRef(index);
    const closedRef = useRef(false);
    const onIndexChangeRef = useRef(onIndexChange);
    indexRef.current = index;
    onIndexChangeRef.current = onIndexChange;
    useBodyScrollLock(phase !== "exit");
    useFocusTrap(rootRef, phase !== "exit");
    const activeImage = useCallback(() => {
        var _a;
        const slide = (_a = trackRef.current) === null || _a === void 0 ? void 0 : _a.children[indexRef.current];
        return slide ? slide.querySelector("img") : null;
    }, []);
    const applyZoom = useCallback(() => {
        const img = activeImage();
        if (!img)
            return;
        const { scale: s, tx, ty } = zoomRef.current;
        if (s > 1.01) {
            img.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
        }
        else {
            img.style.transform = "";
        }
    }, [activeImage]);
    const clampZoom = useCallback((img) => {
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
    }, []);
    const zoomAt = useCallback((clientX, clientY, nextScale) => {
        const img = activeImage();
        if (!img)
            return;
        const { scale: s0, tx: tx0, ty: ty0 } = zoomRef.current;
        const s1 = clamp(nextScale, 1, MAX_SCALE);
        if (Math.abs(s1 - s0) < 0.001)
            return;
        const rect = img.getBoundingClientRect();
        const centerLx = rect.left + rect.width / 2 - tx0;
        const centerLy = rect.top + rect.height / 2 - ty0;
        const ux = (clientX - centerLx) / s0;
        const uy = (clientY - centerLy) / s0;
        const z = {
            scale: s1,
            tx: s1 > 1.01 ? tx0 - ux * (s1 - s0) : 0,
            ty: s1 > 1.01 ? ty0 - uy * (s1 - s0) : 0,
        };
        zoomRef.current = z;
        clampZoom(img);
        setScale(zoomRef.current.scale);
        applyZoom();
    }, [activeImage, applyZoom, clampZoom]);
    const resetZoom = useCallback(() => {
        zoomRef.current = { scale: 1, tx: 0, ty: 0 };
        setScale(1);
        const img = activeImage();
        if (img)
            img.style.transform = "";
    }, [activeImage]);
    const toggleZoomAtCenter = useCallback(() => {
        const img = activeImage();
        if (!img)
            return;
        if (zoomRef.current.scale > 1.01) {
            resetZoom();
            return;
        }
        const rect = img.getBoundingClientRect();
        zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, DOUBLE_TAP_SCALE);
    }, [activeImage, resetZoom, zoomAt]);
    const go = useCallback((dir) => {
        setIndex((i) => {
            if (count === 0)
                return i;
            const next = i + dir;
            if (next < 0)
                return loop ? count - 1 : 0;
            if (next > count - 1)
                return loop ? 0 : count - 1;
            return next;
        });
    }, [count, loop]);
    const requestClose = useCallback(() => {
        if (closedRef.current)
            return;
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
        var _a;
        (_a = closeBtnRef.current) === null || _a === void 0 ? void 0 : _a.focus();
    }, []);
    useEffect(() => {
        var _a;
        const el = (_a = rootRef.current) === null || _a === void 0 ? void 0 : _a.closest("[dir]");
        setRtl((el === null || el === void 0 ? void 0 : el.getAttribute("dir")) === "rtl");
    }, []);
    useEffect(() => {
        if (phase === "exit")
            return;
        const onKeyDown = (event) => {
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
                    if (!loop)
                        setIndex(0);
                    break;
                case "End":
                    if (!loop)
                        setIndex(count - 1);
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
        var _a, _b, _c;
        if (closedRef.current)
            return;
        (_a = onIndexChangeRef.current) === null || _a === void 0 ? void 0 : _a.call(onIndexChangeRef, index);
        const sources = [
            (_b = images[(index + 1) % count]) === null || _b === void 0 ? void 0 : _b.src,
            (_c = images[(index - 1 + count) % count]) === null || _c === void 0 ? void 0 : _c.src,
        ];
        sources.forEach((src) => {
            if (src)
                preloadImage(src).catch(() => undefined);
        });
    }, [index, images, count]);
    useEffect(() => {
        const strip = thumbsRef.current;
        const active = strip === null || strip === void 0 ? void 0 : strip.querySelector('[aria-current="true"]');
        active === null || active === void 0 ? void 0 : active.scrollIntoView({
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
        if (!stage || !zoom)
            return;
        const onWheel = (event) => {
            event.preventDefault();
            const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
            zoomAt(event.clientX, event.clientY, zoomRef.current.scale * factor);
        };
        stage.addEventListener("wheel", onWheel, { passive: false });
        return () => stage.removeEventListener("wheel", onWheel);
    }, [zoom, zoomAt]);
    const toggleFullscreen = useCallback(() => {
        var _a, _b;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => undefined);
        }
        else {
            (_b = (_a = rootRef.current) === null || _a === void 0 ? void 0 : _a.requestFullscreen) === null || _b === void 0 ? void 0 : _b.call(_a).catch(() => undefined);
        }
    }, []);
    const onPointerDown = (event) => {
        if (event.pointerType === "mouse" && event.button !== 0)
            return;
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
        if (d.pointers.size > 2)
            return;
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
        d.downClosable = !event.target.closest("img, button, a");
        if (!d.downClosable) {
            // Capturing the pointer here would retarget the derived click to the
            // stage and swallow the control's own click.
            return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event) => {
        const d = dragRef.current;
        if (!d.pointers.has(event.pointerId))
            return;
        d.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (d.pointers.size >= 2 && d.pinchStart > 0) {
            const [a, b] = Array.from(d.pointers.values());
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist > 0 && zoom) {
                zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d.pinchBaseScale * (dist / d.pinchStart));
            }
            return;
        }
        if (!d.active)
            return;
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
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6)
                return;
            d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        }
        d.moved = true;
        const track = trackRef.current;
        if (d.axis === "x" && track) {
            let effective = dx;
            const atStart = index === 0 && dx > 0;
            const atEnd = index === count - 1 && dx < 0;
            if (!loop && (atStart || atEnd))
                effective = dx * 0.3;
            track.classList.add("oig-lb__track--drag");
            track.style.transform = `translate3d(${-index * track.offsetWidth + effective}px, 0, 0)`;
            d.dx = dx;
            const dt = event.timeStamp - d.lastT;
            if (dt > 0) {
                d.vx = d.vx * 0.8 + ((event.clientX - d.lastX) / dt) * 0.2;
                d.lastX = event.clientX;
                d.lastT = event.timeStamp;
            }
        }
        else if (d.axis === "y" && rootRef.current) {
            const progress = clamp(dy / 320, 0, 1);
            rootRef.current.style.transform = `translateY(${dy}px) scale(${1 - progress * 0.08})`;
            rootRef.current.style.opacity = `${1 - progress * 0.7}`;
            d.dy = dy;
        }
    };
    const settleRoot = () => {
        const root = rootRef.current;
        if (!root)
            return;
        root.style.transition = "transform 320ms var(--oig-ease), opacity 320ms var(--oig-ease)";
        root.style.transform = "";
        root.style.opacity = "";
        window.setTimeout(() => {
            root.style.transition = "";
        }, 340);
    };
    const onPointerUp = (event) => {
        const d = dragRef.current;
        d.pointers.delete(event.pointerId);
        if (d.pointers.size < 2)
            d.pinchStart = 0;
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
        if (!d.active)
            return;
        d.active = false;
        const track = trackRef.current;
        if (d.axis === "x" && track) {
            track.classList.remove("oig-lb__track--drag");
            const width = track.offsetWidth || 1;
            const commitDir = d.dx < -width * SNAP_RATIO || (d.dx < -30 && d.vx < -FLICK_VELOCITY)
                ? 1
                : d.dx > width * SNAP_RATIO || (d.dx > 30 && d.vx > FLICK_VELOCITY)
                    ? -1
                    : 0;
            let next = index;
            if (commitDir === 1 && (loop || index < count - 1)) {
                next = index + 1 < count ? index + 1 : 0;
            }
            else if (commitDir === -1 && (loop || index > 0)) {
                next = index - 1 >= 0 ? index - 1 : count - 1;
            }
            void track.offsetWidth;
            track.style.transform = `translate3d(${-next * width}px, 0, 0)`;
            if (next !== index)
                setIndex(next);
        }
        else if (d.axis === "y") {
            if (Math.abs(d.dy) > DISMISS_DISTANCE) {
                requestClose();
            }
            else {
                settleRoot();
            }
        }
    };
    const onStageClick = (event) => {
        if (dragRef.current.moved) {
            dragRef.current.moved = false;
            return;
        }
        if (!dragRef.current.downClosable)
            return;
        const target = event.target;
        if (target.closest("img, button, a"))
            return;
        requestClose();
    };
    const onStageDoubleClick = (event) => {
        if (!zoom)
            return;
        const target = event.target;
        if (!target.closest("img"))
            return;
        if (zoomRef.current.scale > 1.01) {
            resetZoom();
        }
        else {
            zoomAt(event.clientX, event.clientY, DOUBLE_TAP_SCALE);
        }
    };
    if (count === 0)
        return null;
    const current = images[index];
    const zoomed = scale > 1.01;
    const autoplayActive = autoplay && phase !== "exit" && !paused && !zoomed;
    return createPortal(React.createElement("div", { ref: rootRef, className: `oig oig-lb oig-lb--${phase}`, role: "dialog", "aria-modal": "true", "aria-label": (current === null || current === void 0 ? void 0 : current.alt) || (current === null || current === void 0 ? void 0 : current.caption) || "Image viewer", onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false) },
        React.createElement("div", { className: "oig-lb__veil", onClick: requestClose }),
        autoplay && phase !== "exit" && (React.createElement("div", { key: index, className: `oig-lb__progress${autoplayActive ? "" : " oig-lb__progress--paused"}`, style: { animationDuration: `${autoplayInterval}ms` }, onAnimationEnd: () => go(1), "aria-hidden": "true" })),
        React.createElement("header", { className: "oig-lb__bar" },
            React.createElement("div", { className: "oig-lb__count", "aria-live": "polite" },
                React.createElement("span", { key: index, className: "oig-lb__count-current" }, index + 1),
                React.createElement("span", { "aria-hidden": "true" }, "/"),
                React.createElement("span", null, count)),
            zoom && (React.createElement("button", { type: "button", className: "oig-lb__btn", onClick: toggleZoomAtCenter, "aria-label": zoomed ? "Zoom out" : "Zoom in" },
                React.createElement(Icon, { name: zoomed ? "zoomOut" : "zoomIn" }))),
            React.createElement("button", { type: "button", className: "oig-lb__btn", onClick: toggleFullscreen, "aria-label": isFullscreen ? "Exit fullscreen" : "Enter fullscreen" },
                React.createElement(Icon, { name: isFullscreen ? "collapse" : "expand" })),
            React.createElement("a", { className: "oig-lb__btn", href: current === null || current === void 0 ? void 0 : current.src, download: fileNameFromUrl((_a = current === null || current === void 0 ? void 0 : current.src) !== null && _a !== void 0 ? _a : ""), target: "_blank", rel: "noreferrer", "aria-label": "Download image" },
                React.createElement(Icon, { name: "download" })),
            React.createElement("button", { type: "button", ref: closeBtnRef, className: "oig-lb__btn", onClick: requestClose, "aria-label": "Close viewer" },
                React.createElement(Icon, { name: "close" }))),
        React.createElement("div", { ref: stageRef, className: "oig-lb__stage", onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp, onClick: onStageClick, onDoubleClick: onStageDoubleClick },
            React.createElement("button", { type: "button", className: "oig-lb__btn oig-lb__nav oig-lb__nav--prev", onClick: () => go(-1), disabled: !loop && index === 0, "aria-label": "Previous image" },
                React.createElement(Icon, { name: "prev", size: 22 })),
            React.createElement("div", { ref: trackRef, className: "oig-lb__track", style: { transform: `translate3d(${-index * 100}%, 0, 0)` } }, images.map((item, i) => {
                var _a, _b, _c;
                return (React.createElement("div", { className: "oig-lb__slide", key: `${item.src}-${i}`, "aria-hidden": i !== index },
                    React.createElement("figure", { className: "oig-lb__figure" },
                        !loaded.has(item.src) && React.createElement(Skeleton, null),
                        React.createElement("img", { src: item.src, alt: (_a = item.alt) !== null && _a !== void 0 ? _a : "", className: `oig-lb__img${loaded.has(item.src) ? " oig-lb__img--loaded" : ""}${zoom ? (zoomed ? " oig-lb__img--pan" : " oig-lb__img--zoomable") : ""}`, loading: Math.abs(i - index) <= 1 ? "eager" : "lazy", decoding: "async", draggable: false, onLoad: () => setLoaded((prev) => new Set(prev).add(item.src)) }),
                        React.createElement("figcaption", { className: "oig-visually-hidden" }, (_c = (_b = item.caption) !== null && _b !== void 0 ? _b : item.alt) !== null && _c !== void 0 ? _c : `Image ${i + 1} of ${count}`))));
            })),
            React.createElement("button", { type: "button", className: "oig-lb__btn oig-lb__nav oig-lb__nav--next", onClick: () => go(1), disabled: !loop && index === count - 1, "aria-label": "Next image" },
                React.createElement(Icon, { name: "next", size: 22 }))),
        React.createElement("footer", { className: "oig-lb__foot" },
            React.createElement("p", { key: index, className: "oig-lb__caption" }, current === null || current === void 0 ? void 0 : current.caption),
            showThumbnails && (React.createElement("div", { ref: thumbsRef, className: "oig-lb__thumbs", role: "tablist", "aria-label": "Go to image" }, images.map((item, i) => (React.createElement("button", { key: `${item.src}-thumb-${i}`, type: "button", role: "tab", "aria-selected": i === index, "aria-current": i === index, "aria-label": `Image ${i + 1}`, tabIndex: -1, className: "oig-lb__thumb", onClick: () => setIndex(i) },
                React.createElement("img", { src: item.src, alt: "", loading: "lazy", decoding: "async", draggable: false })))))))), document.body);
};

var css_248z = ".oig-header {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 14px 20px;\n  margin-bottom: 28px;\n}\n\n.oig-header__text {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  min-width: 0;\n}\n\n.oig-header__actions {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 10px;\n}\n\n.oig-header__title {\n  font-size: clamp(1.5rem, 3.4vw, 2.1rem);\n  font-weight: 700;\n  letter-spacing: -0.02em;\n  line-height: 1.08;\n  color: inherit;\n}\n\n.oig-header__title :is(h1, h2, h3, h4, p) {\n  margin: 0;\n  font: inherit;\n  letter-spacing: inherit;\n  line-height: inherit;\n  color: inherit;\n}\n\n.oig-header__subtitle {\n  max-width: 62ch;\n  font-size: 0.96rem;\n  line-height: 1.5;\n  color: color-mix(in srgb, currentColor 62%, transparent);\n}\n\n.oig-header__subtitle :is(h1, h2, h3, h4, p) {\n  margin: 0;\n  font: inherit;\n  line-height: inherit;\n  color: inherit;\n}\n\n.oig-filters {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n  margin-bottom: 20px;\n}\n\n.oig-filter {\n  padding: 7px 15px;\n  border-radius: 999px;\n  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);\n  background: transparent;\n  font-size: 0.82rem;\n  font-weight: 550;\n  color: inherit;\n  opacity: 0.72;\n  transition: background 220ms var(--oig-ease), color 220ms var(--oig-ease),\n    border-color 220ms var(--oig-ease), opacity 220ms var(--oig-ease),\n    transform 220ms var(--oig-ease);\n}\n\n.oig-filter:hover {\n  opacity: 1;\n}\n\n.oig-filter:active {\n  transform: scale(0.95);\n}\n\n.oig-filter[aria-pressed=\"true\"] {\n  background: var(--oig-accent);\n  border-color: var(--oig-accent);\n  color: #ffffff;\n  opacity: 1;\n}\n\n.oig-grid {\n  display: grid;\n  gap: var(--oig-gap);\n  grid-auto-flow: dense;\n  width: 100%;\n}\n\n.oig-grid--mosaic {\n  grid-template-columns: repeat(4, 1fr);\n}\n\n.oig-grid--mosaic .oig-tile {\n  aspect-ratio: 1;\n}\n\n.oig-grid--mosaic .oig-tile:first-child {\n  grid-column: span 2;\n  grid-row: span 2;\n  aspect-ratio: auto;\n}\n\n.oig-grid--featured {\n  grid-template-columns: repeat(3, 1fr);\n}\n\n.oig-grid--featured .oig-tile {\n  aspect-ratio: 4 / 3;\n}\n\n.oig-grid--featured .oig-tile:first-child {\n  grid-column: 1 / -1;\n  aspect-ratio: 2.4 / 1;\n}\n\n.oig-grid--uniform {\n  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));\n}\n\n.oig-grid--uniform .oig-tile {\n  aspect-ratio: 1;\n}\n\n.oig-tile {\n  position: relative;\n  overflow: hidden;\n  border-radius: var(--oig-radius);\n  background: rgba(120, 122, 140, 0.14);\n  cursor: zoom-in;\n  isolation: isolate;\n  animation: oig-tile-in 550ms var(--oig-ease) backwards;\n  animation-delay: calc(var(--oig-i, 0) * 45ms);\n}\n\n@keyframes oig-tile-in {\n  from {\n    opacity: 0;\n    transform: translateY(16px) scale(0.97);\n  }\n}\n\n.oig-tile__img {\n  width: 100%;\n  height: 100%;\n  object-fit: var(--oig-fit, cover);\n  opacity: 0;\n  transition: opacity 400ms var(--oig-ease), transform 700ms var(--oig-ease);\n  will-change: transform;\n}\n\n.oig-tile__img--loaded {\n  opacity: 1;\n}\n\n.oig-tile:hover .oig-tile__img,\n.oig-tile:focus-visible .oig-tile__img {\n  transform: scale(1.06);\n}\n\n.oig-tile::after {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  z-index: 1;\n  background: linear-gradient(\n    115deg,\n    transparent 32%,\n    rgba(255, 255, 255, 0.2) 50%,\n    transparent 68%\n  );\n  transform: translateX(-130%);\n  transition: transform 900ms var(--oig-ease);\n  pointer-events: none;\n}\n\n.oig-tile:hover::after {\n  transform: translateX(130%);\n}\n\n.oig-tile__caption {\n  position: absolute;\n  left: 10px;\n  right: 10px;\n  bottom: 10px;\n  z-index: 2;\n  padding: 6px 11px;\n  border-radius: var(--oig-radius-sm);\n  font-size: 0.78rem;\n  font-weight: 500;\n  color: var(--oig-fg);\n  text-align: left;\n  background: rgba(10, 10, 16, 0.52);\n  backdrop-filter: blur(10px);\n  -webkit-backdrop-filter: blur(10px);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  opacity: 0;\n  transform: translateY(6px);\n  transition: opacity 300ms var(--oig-ease), transform 300ms var(--oig-ease);\n  pointer-events: none;\n}\n\n.oig-tile:hover .oig-tile__caption,\n.oig-tile:focus-visible .oig-tile__caption {\n  opacity: 1;\n  transform: translateY(0);\n}\n\n.oig-tile__more {\n  position: absolute;\n  inset: 0;\n  z-index: 2;\n  display: grid;\n  place-items: center;\n  font-size: clamp(1.05rem, 2.6vw, 1.5rem);\n  font-weight: 650;\n  letter-spacing: 0.01em;\n  color: var(--oig-fg);\n  background: rgba(10, 10, 16, 0.46);\n  backdrop-filter: blur(7px);\n  -webkit-backdrop-filter: blur(7px);\n  transition: background 250ms var(--oig-ease);\n}\n\n.oig-tile:hover .oig-tile__more {\n  background: rgba(10, 10, 16, 0.6);\n}\n\n@media (max-width: 640px) {\n  .oig-header {\n    margin-bottom: 20px;\n  }\n\n  .oig-grid--mosaic {\n    grid-template-columns: repeat(3, 1fr);\n  }\n\n  .oig-grid--featured {\n    grid-template-columns: repeat(2, 1fr);\n  }\n\n  .oig-grid--uniform {\n    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));\n  }\n}\n";
styleInject(css_248z);

const Tile = ({ item, index, fitMode, extra, onOpen }) => {
    var _a;
    const [loaded, setLoaded] = useState(false);
    const label = item.alt || item.caption || `Open image ${index + 1}`;
    return (React.createElement("button", { type: "button", className: "oig-tile", style: { "--oig-i": index, "--oig-fit": fitMode }, onClick: () => onOpen(index), "aria-label": label },
        !loaded && React.createElement(Skeleton, null),
        React.createElement("img", { ref: (el) => {
                if ((el === null || el === void 0 ? void 0 : el.complete) && el.naturalWidth > 0)
                    setLoaded(true);
            }, className: `oig-tile__img${loaded ? " oig-tile__img--loaded" : ""}`, src: item.src, alt: (_a = item.alt) !== null && _a !== void 0 ? _a : "", loading: "lazy", decoding: "async", draggable: false, onLoad: () => setLoaded(true) }),
        item.caption ? (React.createElement("span", { className: "oig-tile__caption" }, item.caption)) : null,
        extra !== undefined ? (React.createElement("span", { className: "oig-tile__more" },
            "+",
            extra)) : null));
};
const OverlayGallery = ({ images, variant = "mosaic", fitMode = "cover", maxTiles = 10, fullScreen = false, width, height, showThumbnails = true, zoom = true, loop = true, autoplay = false, autoplayInterval = 4000, title, subtitle, actions, showFilters = false, defaultCategory, allLabel = "All", className, onOpen, onClose, onIndexChange, onFilterChange, }) => {
    const items = useMemo(() => normalizeItems(images), [images]);
    const categories = useMemo(() => {
        const seen = new Set();
        items.forEach((item) => {
            if (item.category)
                seen.add(item.category);
        });
        return Array.from(seen);
    }, [items]);
    const [activeCategory, setActiveCategory] = useState(() => defaultCategory && categories.includes(defaultCategory)
        ? defaultCategory
        : "all");
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const visible = useMemo(() => activeCategory === "all"
        ? items
        : items.filter((item) => item.category === activeCategory), [items, activeCategory]);
    const tiles = useMemo(() => visible.slice(0, maxTiles), [visible, maxTiles]);
    const extraCount = visible.length - tiles.length;
    const showFilterBar = showFilters && categories.length >= 2;
    const openLightbox = useCallback((index) => {
        setLightboxIndex(index);
        onOpen === null || onOpen === void 0 ? void 0 : onOpen(index);
    }, [onOpen]);
    const closeLightbox = useCallback(() => {
        setLightboxIndex(null);
        onClose === null || onClose === void 0 ? void 0 : onClose();
    }, [onClose]);
    const selectCategory = useCallback((category) => {
        setActiveCategory(category);
        onFilterChange === null || onFilterChange === void 0 ? void 0 : onFilterChange(category);
    }, [onFilterChange]);
    return (React.createElement("section", { className: `oig${className ? ` ${className}` : ""}`, style: {
            width: fullScreen ? "100%" : width,
            height: fullScreen ? "100%" : height,
        }, "aria-label": "Image gallery" },
        (title || subtitle || actions) && (React.createElement("header", { className: "oig-header" },
            (title || subtitle) && (React.createElement("div", { className: "oig-header__text" },
                title ? React.createElement("div", { className: "oig-header__title" }, title) : null,
                subtitle ? (React.createElement("div", { className: "oig-header__subtitle" }, subtitle)) : null)),
            actions ? React.createElement("div", { className: "oig-header__actions" }, actions) : null)),
        showFilterBar && (React.createElement("div", { className: "oig-filters", role: "group", "aria-label": "Filter images" },
            React.createElement("button", { type: "button", className: "oig-filter", "aria-pressed": activeCategory === "all", onClick: () => selectCategory("all") }, allLabel),
            categories.map((category) => (React.createElement("button", { key: category, type: "button", className: "oig-filter", "aria-pressed": activeCategory === category, onClick: () => selectCategory(category) }, category))))),
        React.createElement("div", { key: activeCategory, className: `oig-grid oig-grid--${variant}` }, tiles.map((item, index) => (React.createElement(Tile, { key: `${item.src}-${index}`, item: item, index: index, fitMode: fitMode, extra: extraCount > 0 && index === tiles.length - 1 ? extraCount : undefined, onOpen: openLightbox })))),
        lightboxIndex !== null && visible.length > 0 && (React.createElement(Lightbox, { images: visible, initialIndex: lightboxIndex, showThumbnails: showThumbnails, zoom: zoom, loop: loop, autoplay: autoplay, autoplayInterval: autoplayInterval, onClose: closeLightbox, onIndexChange: onIndexChange }))));
};

export { OverlayGallery as ImageGallery, Lightbox, OverlayGallery };
//# sourceMappingURL=index.esm.js.map
