/**
 * Render node tree builder — shared between frontend and backend
 * (used by server/api/render.post.ts and the browser WASM renderer).
 *
 * Layout math lives here as pure functions so the live preview
 * (PreviewPanel) and the rasterizer share one source of truth.
 */

import type {
  CropRect,
  ExifData,
  RenderNode,
  RenderPayload,
  RenderTreeResult,
  TemplateConfig,
} from "./types";

/**
 * Rounds a float for display and strips trailing zeros — EXIF stores values
 * as rationals, so f/1.8 arrives as 1.7999999999999998 and must never be
 * shown as-is.
 */
const fmtNum = (n: number, maxDecimals = 2): string => {
  if (!Number.isFinite(n)) return "";
  return String(parseFloat(n.toFixed(maxDecimals)));
};

export const formatExif = (data: ExifData | null | undefined, field: string): string => {
  if (!data) return "";
  switch (field) {
    case "fNumber":
      return data.fNumber ? `f/${fmtNum(data.fNumber)}` : "";
    case "exposureTime":
      return (
        data.exposureTimeFormatted ||
        (data.exposureTime
          ? data.exposureTime < 1
            ? `1/${Math.round(1 / data.exposureTime)}`
            : `${fmtNum(data.exposureTime)}"`
          : "")
      );
    case "iso":
      return data.iso ? `ISO ${data.iso}` : "";
    case "focalLength":
      return data.focalLength ? `${fmtNum(data.focalLength)}mm` : "";
    case "focalLengthIn35mm":
      return data.focalLengthIn35mm ? `${fmtNum(data.focalLengthIn35mm)}mm` : "";
    case "exposureBias":
      return data.exposureBias !== undefined
        ? `${data.exposureBias > 0 ? "+" : ""}${fmtNum(data.exposureBias)} EV`
        : "";
    case "dateTimeOriginal":
      return data.dateTimeOriginal ? formatCaptureDate(data.dateTimeOriginal) : "";
    case "make":
      return data.make || "";
    case "model":
      return data.model || "";
    case "lensModel":
      return data.lensModel || "";
    case "gps":
      return data.latitude != null && data.longitude != null
        ? `${Number(data.latitude).toFixed(6)}, ${Number(data.longitude).toFixed(6)}`
        : "";
    default:
      return String((data as Record<string, unknown>)[field] || "");
  }
};

/**
 * Canonical capture-date formatting for the footer — date only, deterministic
 * (no locale/ICU dependence), shared with the live preview so what you see
 * before export is exactly what gets rasterized.
 */
export const formatCaptureDate = (value: Date | string): string => {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

/**
 * Computes the cover-cropped image geometry for a box of boxW x boxH.
 *
 * `aspect` is the photo's width/height ratio. At scale = 1 the image is the
 * cover fit (fills the box, overflowing the longer side); `scale` zooms from
 * there. `offsetX/offsetY` in [-1, 1] pan across the overflow (0 = centered,
 * -1 = show the left/top edge, 1 = show the right/bottom edge).
 */
export const coverCropRect = (
  boxW: number,
  boxH: number,
  aspect: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): CropRect => {
  const s = Math.max(1, scale || 1);
  const ox = Math.max(-1, Math.min(1, offsetX || 0));
  const oy = Math.max(-1, Math.min(1, offsetY || 0));
  const boxAspect = boxW / boxH;
  // Cover-fit base size (scale = 1)
  const w = (aspect >= boxAspect ? boxH * aspect : boxW) * s;
  const h = (aspect >= boxAspect ? boxH : boxW / aspect) * s;
  return {
    left: -((w - boxW) * (0.5 + ox * 0.5)),
    top: -((h - boxH) * (0.5 + oy * 0.5)),
    width: w,
    height: h,
  };
};

// ── Pure layout helpers (single source of truth for preview + export) ───────

/** 1080-wide social canvas dims for a "W:H" ratio. */
export function socialCanvasDims(ratio?: string): { w: number; h: number } {
  const r = ratio || "4:5";
  const parts = r.split(":").map(Number);
  const w = parts[0];
  const h = parts[1];
  if (parts.length === 2 && w !== undefined && h !== undefined && w > 0 && h > 0) {
    return { w: 1080, h: Math.round((1080 * h) / w) };
  }
  return { w: 1080, h: 1350 };
}

export interface LogoImageSize {
  width: number;
  height: number;
}

/**
 * Image-logo dimensions at the given scale factor / footer width.
 * logoScale % of baseline (modelFontSizeBase × 1.4), width from logoAspect,
 * capped to footerInnerW.
 */
export function computeLogoImageSize(
  cfg: TemplateConfig,
  scaleFactor: number,
  footerInnerW: number,
): LogoImageSize {
  const modelFontSizeBase = cfg.modelFontSize ?? 24;
  if (cfg.logoImageUrl && cfg.logoAspect && cfg.logoAspect > 0) {
    const scalePct = cfg.logoScale ?? 100;
    const baselineH = modelFontSizeBase * 1.4;
    let h = Math.round(baselineH * scaleFactor * (scalePct / 100));
    let w = Math.round(h * cfg.logoAspect);
    if (w > footerInnerW) {
      w = footerInnerW;
      h = Math.round(w / cfg.logoAspect);
    }
    return { width: w, height: h };
  }
  return {
    width: Math.round(modelFontSizeBase * 5 * scaleFactor),
    height: Math.round(modelFontSizeBase * 1.4 * scaleFactor),
  };
}

/** A visible EXIF field with its formatted text (empty values filtered out) */
export interface ExifEntry {
  key: string;
  value: string;
}

/** Formatted entries for the template's visible fields, in the user's order */
export function exifEntriesFor(
  exif: ExifData | null | undefined,
  fields: readonly string[] | undefined,
): ExifEntry[] {
  return (fields ?? [])
    .map((key) => ({ key, value: formatExif(exif, key) }))
    .filter((e) => e.value);
}

/**
 * Rows of the "split" caption (the camera-watermark bar). Each field lands in
 * a fixed slot by meaning; within a slot the user's field order is kept.
 */
export interface SplitCaption {
  /** Camera make / model — left, primary */
  leftMain: string[];
  /** Lens — left, secondary */
  leftSub: string[];
  /** Exposure (focal length, aperture, shutter, ISO, …) — right, primary */
  rightMain: string[];
  /** Capture date and location — right, secondary */
  rightSub: string[];
}

export function splitCaption(entries: ExifEntry[]): SplitCaption {
  const out: SplitCaption = { leftMain: [], leftSub: [], rightMain: [], rightSub: [] };
  for (const { key, value } of entries) {
    if (key === "make" || key === "model") out.leftMain.push(value);
    else if (key === "lensModel") out.leftSub.push(value);
    else if (key === "dateTimeOriginal" || key === "gps") out.rightSub.push(value);
    else out.rightMain.push(value);
  }
  return out;
}

/** The film date-stamp text, e.g. '26 10 23 — like the LCD backs of 90s compacts */
export const formatDateStamp = (value: Date | string | undefined): string => {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return `'${String(d.getFullYear() % 100).padStart(2, "0")} ${d.getMonth() + 1} ${d.getDate()}`;
};

/** Seven-segment face of the date stamp (self-hosted, see shared/fonts.ts) */
export const DATE_STAMP_FONT = "DSEG7 Classic";

/** CSS font-family list naming every face an export of this config draws with */
export function exportFontFamily(cfg: TemplateConfig): string {
  return cfg.dateStamp ? `${cfg.fontFamily}, ${DATE_STAMP_FONT}` : cfg.fontFamily;
}

export interface FooterLayoutInput {
  cfg: TemplateConfig;
  scaleFactor: number;
  canvasW: number;
  /** Visible EXIF entries (see exifEntriesFor) */
  exifEntries: ExifEntry[];
  /** Camera make used as the text-logo fallback when logoText is empty */
  makeFallback?: string;
}

export interface FooterLayout {
  footerContentH: number;
  footerH: number;
  hasLogo: boolean;
  hasExif: boolean;
  logoTxt: string;
  logoImageW: number;
  logoImageH: number;
  footerPaddingX: number;
  footerInnerW: number;
}

const LINE_HEIGHT = 1.4;

/**
 * Scale of everything in the caption band. The band spans the canvas width,
 * so it is sized by the width — not by the long edge like the borders.
 * Otherwise a portrait photo gets a caption a third too big for its width:
 * the split bar's right block swelled past the middle and its logo sat
 * "almost but not quite" centred. Landscape is unchanged (width = long edge).
 */
export const captionScale = (scaleFactor: number, canvasW: number) =>
  Math.min(scaleFactor, canvasW / 1080);

/** Font sizes of the split caption's primary and secondary rows */
const splitFontSizes = (cfg: TemplateConfig, scaleFactor: number) => ({
  main: Math.round((cfg.fontSize ?? 14) * scaleFactor),
  sub: Math.round((cfg.fontSize ?? 14) * 0.8 * scaleFactor),
});

/** Footer content + total height — shared by buildRenderTree and the preview. */
export function estimateFooterLayout(input: FooterLayoutInput): FooterLayout {
  const { cfg, scaleFactor, canvasW, exifEntries } = input;
  const cs = captionScale(scaleFactor, canvasW);
  const exifValues = exifEntries.map((e) => e.value);
  const modelFontSizeBase = cfg.modelFontSize ?? 24;
  const modelFontSize = Math.round(modelFontSizeBase * cs);
  const fontSize = Math.round((cfg.fontSize ?? 14) * cs);
  const tracking = (cfg.letterSpacing ?? 0) * cs;
  const logoTxt = cfg.logoText || (input.makeFallback || "").toUpperCase();
  const hasLogo = cfg.showLogo !== false && (!!cfg.logoImageUrl || !!logoTxt);
  const hasExif = exifValues.length > 0;

  const logoLineH = Math.ceil(modelFontSize * LINE_HEIGHT);
  const exifLineH = Math.ceil(fontSize * LINE_HEIGHT);
  const footerPaddingX = Math.max(
    Math.round(20 * scaleFactor),
    Math.round((cfg.paddingHorizontal ?? 0) * scaleFactor),
  );
  const footerInnerW = Math.max(1, canvasW - footerPaddingX * 2);

  const { width: logoImageW, height: logoImageH } = computeLogoImageSize(cfg, cs, footerInnerW);
  const logoBlockH = hasLogo ? Math.max(logoLineH, cfg.logoImageUrl ? logoImageH : 0) : 0;

  let footerContentH = 0;
  if (cfg.captionStyle === "split") {
    const rows = splitCaption(exifEntries);
    const fs = splitFontSizes(cfg, cs);
    const rowGap = Math.round(4 * cs);
    const colH = (main: string[], sub: string[]) => {
      const mainH = main.length ? Math.ceil(fs.main * LINE_HEIGHT) : 0;
      const subH = sub.length ? Math.ceil(fs.sub * LINE_HEIGHT) : 0;
      return mainH + subH + (mainH && subH ? rowGap : 0);
    };
    footerContentH = Math.max(
      colH(rows.leftMain, rows.leftSub),
      colH(rows.rightMain, rows.rightSub),
      logoBlockH,
    );
  } else {
    let exifLines = hasExif ? 1 : 0;
    if (cfg.infoLayout === "list") {
      exifLines = exifValues.length;
    } else if (cfg.infoLayout === "grid") {
      exifLines = Math.ceil(exifValues.length / 2);
    } else if (hasExif) {
      const rowGap = Math.round(10 * cs);
      const logoW = cfg.logoImageUrl
        ? logoImageW
        : Math.ceil(logoTxt.length * (modelFontSize * 0.7 + tracking));
      const availExifW =
        hasLogo && cfg.logoPosition !== "center"
          ? Math.max(1, footerInnerW - logoW - Math.round(16 * cs))
          : footerInnerW;
      let curW = 0;
      for (const t of exifValues) {
        const w = t.length * (fontSize * 0.62 + tracking);
        if (curW > 0 && curW + rowGap + w > availExifW) {
          exifLines++;
          curW = w;
        } else {
          curW += (curW > 0 ? rowGap : 0) + w;
        }
      }
    }

    const gridGapV = Math.round(4 * cs);
    const rowGap = Math.round((cfg.infoLayout === "list" ? 4 : 10) * cs);
    const exifBlockH = hasExif
      ? exifLines * exifLineH +
        Math.max(0, exifLines - 1) * (cfg.infoLayout === "grid" ? gridGapV : rowGap)
      : 0;

    if (hasLogo && hasExif && cfg.logoPosition === "center") {
      footerContentH = logoBlockH + Math.round(12 * cs) + exifBlockH;
    } else {
      footerContentH = Math.max(logoBlockH, exifBlockH);
    }
  }
  const footerH = hasLogo || hasExif ? Math.round(40 * cs) + footerContentH : 0;

  return {
    footerContentH,
    footerH,
    hasLogo,
    hasExif,
    logoTxt,
    logoImageW,
    logoImageH,
    footerPaddingX,
    footerInnerW,
  };
}

export interface CanvasDimsInput {
  cfg: TemplateConfig;
  photoWidth: number;
  photoHeight: number;
  /** Visible EXIF entries (for original-mode height, which depends on footerH) */
  exifEntries?: ExifEntry[];
  makeFallback?: string;
}

/** Canvas width/height for any canvasMode. */
export function computeCanvasDims(input: CanvasDimsInput): { w: number; h: number } {
  const { cfg, photoWidth, photoHeight } = input;

  if (cfg.canvasMode === "social") {
    return socialCanvasDims(cfg.socialRatio);
  }

  // original mode: auto-height from photo aspect + paddings + footer.
  // Scale is photo-anchored (see layoutScaleFactor) so the height math here
  // and the node-tree layout in buildRenderTree can never drift apart.
  const w = photoWidth || 1080;
  const scaleFactor = layoutScaleFactor({
    cfg,
    canvasWidth: w,
    canvasHeight: photoHeight || w,
    photoWidth: w,
    photoHeight,
  });
  const paddingH = Math.round((cfg.paddingHorizontal ?? 0) * scaleFactor);
  const paddingTop = Math.round((cfg.paddingTop ?? 0) * scaleFactor);
  const paddingBottom = Math.round((cfg.paddingBottom ?? 0) * scaleFactor);
  const { footerH } = estimateFooterLayout({
    cfg,
    scaleFactor,
    canvasW: w,
    exifEntries: input.exifEntries ?? [],
    makeFallback: input.makeFallback,
  });
  const availW = w - paddingH * 2;
  const pAspect = photoWidth && photoHeight && photoHeight > 0 ? photoWidth / photoHeight : 1;
  const imgH = availW / pAspect;
  return { w, h: Math.round(imgH + paddingTop + paddingBottom + footerH) };
}

export interface LayoutScaleInput {
  cfg: TemplateConfig;
  canvasWidth: number;
  canvasHeight: number;
  photoWidth?: number;
  photoHeight?: number;
}

/**
 * The single layout scale for a canvas. Social canvases are explicit,
 * so the scale follows the canvas. Original-mode canvases auto-size from the
 * photo (height depends on the footer, which depends on the scale), so the
 * scale is anchored to the photo's longer edge — deterministic and identical
 * between the live preview and buildRenderTree. (Regression: the scale was
 * recomputed from the canvas dims after the footer inflated the height, so
 * portrait exports rendered ~8% larger than the preview.)
 */
export function layoutScaleFactor(input: LayoutScaleInput): number {
  const { cfg, canvasWidth, canvasHeight } = input;
  if (cfg.canvasMode !== "original") {
    return Math.max(canvasWidth, canvasHeight) / 1080;
  }
  const w = input.photoWidth || canvasWidth || 1080;
  return Math.max(w, input.photoHeight || w) / 1080;
}

export interface FrameGeometryInput {
  cfg: TemplateConfig;
  photoWidth: number;
  photoHeight: number;
  exifEntries: ExifEntry[];
  makeFallback?: string;
  /**
   * Uniform output scale. The live preview builds the tree at its on-screen
   * size (scale < 1) instead of CSS-scaling a full-resolution canvas, so a
   * blurred background never has to be composited at 6000px.
   */
  scale?: number;
}

/** Every size the node tree is built from, in output pixels */
export interface FrameGeometry {
  canvasW: number;
  canvasH: number;
  scaleFactor: number;
  footer: FooterLayout;
  paddingTop: number;
  paddingBottom: number;
  paddingH: number;
  /** Box the photo is fitted into (between the paddings, above the footer) */
  availW: number;
  availH: number;
  /** Contain-fit photo size inside avail */
  imgW: number;
  imgH: number;
}

export function computeFrameGeometry(input: FrameGeometryInput): FrameGeometry {
  const { cfg, photoWidth, photoHeight } = input;
  const k = input.scale ?? 1;
  const full = computeCanvasDims({
    cfg,
    photoWidth,
    photoHeight,
    exifEntries: input.exifEntries,
    makeFallback: input.makeFallback,
  });
  const canvasW = Math.max(1, Math.round(full.w * k));
  const canvasH = Math.max(1, Math.round(full.h * k));
  const scaleFactor =
    layoutScaleFactor({
      cfg,
      canvasWidth: full.w,
      canvasHeight: full.h,
      photoWidth,
      photoHeight,
    }) * k;
  // The footer is estimated at full resolution and then scaled: estimating it
  // at a small preview scale rounds every line height up, so the preview's
  // footer came out relatively taller and letterboxed the photo.
  const fullFooter = estimateFooterLayout({
    cfg,
    scaleFactor: scaleFactor / k,
    canvasW: full.w,
    exifEntries: input.exifEntries,
    makeFallback: input.makeFallback,
  });
  const footer: FooterLayout =
    k === 1
      ? fullFooter
      : {
          ...fullFooter,
          footerContentH: Math.round(fullFooter.footerContentH * k),
          footerH: Math.round(fullFooter.footerH * k),
          logoImageW: Math.round(fullFooter.logoImageW * k),
          logoImageH: Math.round(fullFooter.logoImageH * k),
          footerPaddingX: Math.round(fullFooter.footerPaddingX * k),
          footerInnerW: Math.round(fullFooter.footerInnerW * k),
        };

  const paddingTop = Math.round((cfg.paddingTop ?? 0) * scaleFactor);
  const paddingBottom = Math.round((cfg.paddingBottom ?? 0) * scaleFactor);
  const paddingH = Math.round((cfg.paddingHorizontal ?? 0) * scaleFactor);
  const availW = canvasW - paddingH * 2;
  const availH = Math.max(1, canvasH - footer.footerH - paddingTop - paddingBottom);

  const pAspect = photoWidth && photoHeight && photoHeight > 0 ? photoWidth / photoHeight : 1;
  let imgW: number;
  let imgH: number;
  if (availW > 0 && availH > 0 && pAspect > availW / availH) {
    imgW = availW;
    imgH = Math.round(availW / pAspect);
  } else {
    imgH = availH;
    imgW = Math.round(availH * pAspect);
  }

  return {
    canvasW,
    canvasH,
    scaleFactor,
    footer,
    paddingTop,
    paddingBottom,
    paddingH,
    availW,
    availH,
    imgW,
    imgH,
  };
}

// ── Node tree builder ───────────────────────────────────────────────────────

export interface BuildOptions {
  /** See FrameGeometryInput.scale */
  scale?: number;
}

export const buildRenderTree = (
  payload: RenderPayload,
  options: BuildOptions = {},
): RenderTreeResult => {
  const { photoBase64, exifData, templateConfig: cfg, exportOptions } = payload;
  const photoWidth = payload.photoWidth || 1080;
  const photoHeight = payload.photoHeight || 1080;

  const entries = exifEntriesFor(exifData, cfg.visibleFields as string[]);
  const exifTexts = entries.map((e) => e.value);
  const geo = computeFrameGeometry({
    cfg,
    photoWidth,
    photoHeight,
    exifEntries: entries,
    makeFallback: exifData?.make,
    scale: options.scale,
  });
  const { canvasW: canvasWidth, canvasH: canvasHeight, scaleFactor, footer } = geo;
  const { hasLogo, hasExif, logoTxt, logoImageW, logoImageH, footerPaddingX } = footer;
  const px = (v: number) => Math.round(v * scaleFactor);
  // Caption-band sizes (see captionScale)
  const cs = captionScale(scaleFactor, canvasWidth);
  const cpx = (v: number) => Math.round(v * cs);

  const bgColor = cfg.backgroundColor || "#ffffff";
  const borderRadius = px(cfg.borderRadius ?? 0);

  const fontFamily = cfg.fontFamily || "Inter, sans-serif";
  const fontSize = cpx(cfg.fontSize ?? 14);
  const fontColor = cfg.fontColor || "#000000";
  const secondaryColor = cfg.secondaryColor || fontColor;
  const modelFontSize = cpx(cfg.modelFontSize ?? 24);
  const tracking = cfg.letterSpacing ? cpx(cfg.letterSpacing) : 0;
  const trackingStyle = tracking ? { letterSpacing: tracking } : {};
  const logoPosition = cfg.logoPosition || "center";
  const logoImageUrl: string = cfg.logoImageUrl || "";
  const infoLayout = cfg.infoLayout || "horizontal";

  const gridGapV = cpx(4);
  const rowGap = cpx(infoLayout === "list" ? 4 : 10);

  const pAspect = photoWidth / photoHeight;
  const crop = payload.crop;
  const useCover = crop?.fitMode === "cover";
  const boxW = Math.round(useCover ? geo.availW : geo.imgW);
  const boxH = Math.round(useCover ? geo.availH : geo.imgH);

  const children: RenderNode[] = [];

  // Frosted background: the photo itself, blurred and darkened. Takumi (and
  // the browser) blur a layer only within the canvas, so its edges fade to
  // transparent. The canvas underneath is filled with the photo's average
  // tone and a lighter blur sits between, so the fade reads as a soft
  // vignette instead of showing the page colour (or, worse, a sharp copy).
  const photoTone =
    cfg.backgroundMode === "blur" && /^#[0-9a-f]{6}$/i.test(payload.photoTone ?? "")
      ? payload.photoTone
      : undefined;
  if (cfg.backgroundMode === "blur") {
    const blur = px(cfg.backgroundBlur ?? 40);
    const dim = Math.min(90, Math.max(0, cfg.backgroundDim ?? 20));
    for (const radius of [Math.round(blur / 3), blur]) {
      children.push({
        type: "image",
        src: photoBase64,
        width: canvasWidth,
        height: canvasHeight,
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          objectFit: "cover",
          ...(radius > 0 && { filter: `blur(${radius}px)` }),
        },
      });
    }
    if (dim > 0) {
      children.push({
        type: "container",
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: `rgba(0, 0, 0, ${dim / 100})`,
        },
      });
    }
  }

  const photoChildren: RenderNode[] = [];
  if (useCover) {
    const {
      left,
      top,
      width: cw,
      height: ch,
    } = coverCropRect(
      boxW,
      boxH,
      pAspect,
      crop?.scale ?? 1,
      crop?.offsetX ?? 0,
      crop?.offsetY ?? 0,
    );
    photoChildren.push({
      type: "image",
      src: photoBase64,
      width: Math.round(cw),
      height: Math.round(ch),
      style: { position: "absolute", left: Math.round(left), top: Math.round(top) },
    });
  } else {
    photoChildren.push({ type: "image", src: photoBase64, width: boxW, height: boxH });
  }

  const stamp = cfg.dateStamp ? formatDateStamp(exifData?.dateTimeOriginal) : "";
  if (stamp) {
    const stampSize = Math.max(6, Math.round(Math.min(boxW, boxH) * 0.045));
    const stampColor = cfg.dateStampColor || "#FF7A1A";
    photoChildren.push({
      type: "text",
      text: stamp,
      style: {
        position: "absolute",
        right: Math.round(stampSize * 1.3),
        bottom: Math.round(stampSize * 1.1),
        fontSize: stampSize,
        fontFamily: DATE_STAMP_FONT,
        fontWeight: "bold",
        color: stampColor,
        opacity: 0.9,
        letterSpacing: Math.round(stampSize * 0.1),
        textShadow: `0 0 ${Math.max(1, Math.round(stampSize * 0.3))}px ${stampColor}`,
        whiteSpace: "nowrap",
      },
    });
  }

  // The photo always sits in a clipping frame: it carries the radius (so a
  // cover crop is clipped to it), the shadow, and the date stamp.
  const shadow = Math.min(100, Math.max(0, cfg.photoShadow ?? 0));
  const photoFrame: RenderNode = {
    type: "container",
    tagName: "div",
    style: {
      position: "relative",
      display: "flex",
      width: boxW,
      height: boxH,
      overflow: "hidden",
      borderRadius,
      ...(shadow > 0 && {
        boxShadow: `0 ${px(shadow * 0.25)}px ${px(shadow * 0.7)}px rgba(0, 0, 0, ${(0.15 + shadow * 0.0035).toFixed(3)})`,
      }),
    },
    children: photoChildren,
  };

  children.push({
    type: "container",
    tagName: "div",
    style: {
      position: "relative",
      // Fixed to the computed photo box, so a footer that renders a few px
      // taller than estimated can only eat into its own band, never the photo
      height: geo.paddingTop + geo.availH + geo.paddingBottom,
      flexShrink: 0,
      boxSizing: "border-box",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      paddingTop: geo.paddingTop,
      paddingBottom: geo.paddingBottom,
      paddingLeft: geo.paddingH,
      paddingRight: geo.paddingH,
    },
    children: [photoFrame],
  });

  const mkText = (text: string, style: Record<string, unknown>): RenderNode => ({
    type: "text",
    text,
    style: { fontFamily, ...trackingStyle, ...style },
  });

  const logoNode: RenderNode = logoImageUrl
    ? {
        type: "image",
        src: logoImageUrl,
        width: logoImageW,
        height: logoImageH,
        style: { objectFit: "contain" },
      }
    : mkText(logoTxt, { fontSize: modelFontSize, fontWeight: "bold", color: fontColor });

  if (hasLogo || hasExif) {
    const footerChildren: RenderNode[] =
      cfg.captionStyle === "split" ? buildSplitCaption() : buildStackCaption();
    children.push({
      type: "container",
      tagName: "div",
      style: {
        position: "relative",
        flex: 1,
        display: "flex",
        alignItems: "center",
        paddingTop: cpx(20),
        paddingBottom: cpx(20),
        paddingLeft: footerPaddingX,
        paddingRight: footerPaddingX,
        width: "100%",
        boxSizing: "border-box",
      },
      children: footerChildren,
    });
  }

  function buildStackCaption(): RenderNode[] {
    const out: RenderNode[] = [];
    const mkSpacer = () => ({ type: "container" as const, style: { flex: 1 } });
    const mkExifText = (text: string) => mkText(text, { fontSize, color: secondaryColor });

    let exifNode: RenderNode;
    if (infoLayout === "list") {
      exifNode = {
        type: "container",
        tagName: "div",
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: `${rowGap}px`,
        },
        children: exifTexts.map(mkExifText),
      };
    } else if (infoLayout === "grid") {
      exifNode = {
        type: "container",
        tagName: "div",
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(2, auto)",
          justifyContent: "center",
          alignItems: "center",
          gap: `${gridGapV}px ${cpx(14)}px`,
        },
        children: exifTexts.map(mkExifText),
      };
    } else {
      exifNode = {
        type: "container",
        tagName: "div",
        style: {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "flex-start",
          alignItems: "center",
          gap: `${rowGap}px`,
        },
        children: exifTexts.map(mkExifText),
      };
    }

    if (hasLogo && hasExif) {
      if (logoPosition === "center") {
        out.push({
          type: "container",
          tagName: "div",
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: `${cpx(12)}px`,
            flex: 1,
          },
          children: [logoNode, exifNode],
        });
      } else if (logoPosition === "right") {
        out.push(exifNode, mkSpacer(), logoNode);
      } else {
        out.push(logoNode, mkSpacer(), exifNode);
      }
    } else if (hasLogo) {
      if (logoPosition === "center") out.push(mkSpacer(), logoNode, mkSpacer());
      else if (logoPosition === "right") out.push(mkSpacer(), logoNode);
      else out.push(logoNode, mkSpacer());
    } else if (logoPosition === "right") {
      out.push(mkSpacer(), exifNode);
    } else if (logoPosition === "left") {
      out.push(exifNode);
    } else {
      out.push(mkSpacer(), exifNode, mkSpacer());
    }
    return out;
  }

  function buildSplitCaption(): RenderNode[] {
    const rows = splitCaption(entries);
    const fs = splitFontSizes(cfg, cs);
    const itemGap = cpx(10);
    const mkRow = (items: string[], main: boolean): RenderNode => ({
      type: "container",
      tagName: "div",
      style: { display: "flex", flexDirection: "row", gap: `${itemGap}px` },
      children: items.map((text) =>
        mkText(text, {
          fontSize: main ? fs.main : fs.sub,
          fontWeight: main ? "bold" : "normal",
          color: main ? fontColor : secondaryColor,
          whiteSpace: "nowrap",
        }),
      ),
    });
    const mkColumn = (main: string[], sub: string[], align: "flex-start" | "flex-end") => ({
      type: "container" as const,
      tagName: "div",
      style: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: align,
        gap: `${cpx(4)}px`,
      },
      children: [
        ...(main.length ? [mkRow(main, true)] : []),
        ...(sub.length ? [mkRow(sub, false)] : []),
      ],
    });

    const hasLeft = rows.leftMain.length + rows.leftSub.length > 0;
    const hasRight = rows.rightMain.length + rows.rightSub.length > 0;
    const right: RenderNode[] = [];
    if (hasLogo) right.push(logoNode);
    if (hasLogo && hasRight) {
      const mainH = rows.rightMain.length ? Math.ceil(fs.main * LINE_HEIGHT) : 0;
      const subH = rows.rightSub.length ? Math.ceil(fs.sub * LINE_HEIGHT) : 0;
      right.push({
        type: "container",
        tagName: "div",
        style: {
          width: Math.max(1, cpx(1.5)),
          height: Math.max(mainH + subH, Math.round(modelFontSize * 1.1)),
          backgroundColor: secondaryColor,
          opacity: 0.6,
        },
      });
    }
    if (hasRight) right.push(mkColumn(rows.rightMain, rows.rightSub, "flex-start"));

    return [
      ...(hasLeft ? [mkColumn(rows.leftMain, rows.leftSub, "flex-start")] : []),
      { type: "container", style: { flex: 1 } },
      {
        type: "container",
        tagName: "div",
        style: { display: "flex", flexDirection: "row", alignItems: "center", gap: `${cpx(14)}px` },
        children: right,
      },
    ];
  }

  // Film edge marking, centred in the top border band
  const edgeText = cfg.edgeText?.trim();
  if (edgeText && geo.paddingTop > 0) {
    children.push({
      type: "container",
      tagName: "div",
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        width: canvasWidth,
        height: geo.paddingTop,
        display: "flex",
        alignItems: "center",
        paddingLeft: Math.max(geo.paddingH, px(20)),
        boxSizing: "border-box",
      },
      children: [
        mkText(edgeText, {
          fontSize: Math.min(
            cpx(Math.max(10, (cfg.fontSize ?? 14) * 0.85)),
            Math.round(geo.paddingTop * 0.5),
          ),
          color: secondaryColor,
          fontWeight: "bold",
          whiteSpace: "nowrap",
        }),
      ],
    });
  }

  const nodeTree = {
    type: "container",
    tagName: "div",
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: photoTone ?? bgColor,
      overflow: "hidden",
      lineHeight: 1.2,
    },
    children,
  };

  const format = exportOptions?.format || "png";
  const quality = exportOptions?.quality ?? 95;

  return { nodeTree, width: canvasWidth, height: canvasHeight, format, quality, photoFrame };
};
