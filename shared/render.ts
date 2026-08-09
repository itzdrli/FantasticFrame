/**
 * Render node tree builder — shared between frontend and backend
 * (used by server/api/render.post.ts and the browser WASM renderer).
 *
 * Layout math lives here as pure functions so the live preview
 * (PreviewPanel) and the rasterizer share one source of truth.
 */

import type { CropRect, RenderPayload, RenderTreeResult, TemplateConfig } from "./types";
import { SOCIAL_RATIO_HEIGHTS } from "./types";

export const formatExif = (data: any, field: string): string => {
  if (!data) return "";
  switch (field) {
    case "fNumber":
      return data.fNumber ? `f/${data.fNumber}` : "";
    case "exposureTime":
      return (
        data.exposureTimeFormatted ||
        (data.exposureTime
          ? data.exposureTime < 1
            ? `1/${Math.round(1 / data.exposureTime)}`
            : `${data.exposureTime}"`
          : "")
      );
    case "iso":
      return data.iso ? `ISO ${data.iso}` : "";
    case "focalLength":
      return data.focalLength ? `${data.focalLength}mm` : "";
    case "focalLengthIn35mm":
      return data.focalLengthIn35mm ? `${data.focalLengthIn35mm}mm` : "";
    case "exposureBias":
      return data.exposureBias !== undefined
        ? `${data.exposureBias > 0 ? "+" : ""}${data.exposureBias} EV`
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
      return data[field] || "";
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

/** 1080-wide social canvas dims for a "W:H" ratio (known table or computed). */
export function socialCanvasDims(ratio?: string): { w: number; h: number } {
  const r = ratio || "4:5";
  if (SOCIAL_RATIO_HEIGHTS[r]) return { w: 1080, h: SOCIAL_RATIO_HEIGHTS[r]! };
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
 * Preferred model: logoScale % of baseline (modelFontSizeBase × 1.4), width
 * from logoAspect, capped to footerInnerW. Legacy fallback: logoWidth/Height.
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
    width: Math.round((cfg.logoWidth ?? modelFontSizeBase * 5) * scaleFactor),
    height: Math.round((cfg.logoHeight ?? modelFontSizeBase * 1.4) * scaleFactor),
  };
}

export interface FooterLayoutInput {
  cfg: TemplateConfig;
  scaleFactor: number;
  canvasW: number;
  /** Already-formatted EXIF display strings (empty entries filtered out) */
  exifValues: string[];
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

/** Footer content + total height — shared by buildRenderTree and the preview. */
export function estimateFooterLayout(input: FooterLayoutInput): FooterLayout {
  const { cfg, scaleFactor, canvasW, exifValues } = input;
  const modelFontSizeBase = cfg.modelFontSize ?? 24;
  const modelFontSize = Math.round(modelFontSizeBase * scaleFactor);
  const fontSize = Math.round((cfg.fontSize ?? 14) * scaleFactor);
  const logoTxt = cfg.logoText || (input.makeFallback || "").toUpperCase();
  const hasLogo = cfg.showLogo !== false && (!!cfg.logoImageUrl || !!logoTxt);
  const hasExif = exifValues.length > 0;

  const logoLineH = Math.ceil(modelFontSize * 1.4);
  const exifLineH = Math.ceil(fontSize * 1.4);
  const footerPaddingX = Math.max(
    Math.round(20 * scaleFactor),
    Math.round((cfg.paddingHorizontal ?? 0) * scaleFactor),
  );
  const footerInnerW = Math.max(1, canvasW - footerPaddingX * 2);

  const { width: logoImageW, height: logoImageH } = computeLogoImageSize(
    cfg,
    scaleFactor,
    footerInnerW,
  );

  let exifLines = hasExif ? 1 : 0;
  if (cfg.infoLayout === "list") {
    exifLines = exifValues.length;
  } else if (cfg.infoLayout === "grid") {
    exifLines = Math.ceil(exifValues.length / 2);
  } else if (hasExif) {
    const rowGap = Math.round(10 * scaleFactor);
    const logoW = cfg.logoImageUrl ? logoImageW : Math.ceil(logoTxt.length * modelFontSize * 0.7);
    const availExifW =
      hasLogo && cfg.logoPosition !== "center"
        ? Math.max(1, footerInnerW - logoW - Math.round(16 * scaleFactor))
        : footerInnerW;
    let curW = 0;
    for (const t of exifValues) {
      const w = t.length * fontSize * 0.62;
      if (curW > 0 && curW + rowGap + w > availExifW) {
        exifLines++;
        curW = w;
      } else {
        curW += (curW > 0 ? rowGap : 0) + w;
      }
    }
  }

  const gridGapV = Math.round(4 * scaleFactor);
  const rowGap = Math.round((cfg.infoLayout === "list" ? 4 : 10) * scaleFactor);
  const exifBlockH = hasExif
    ? exifLines * exifLineH +
      Math.max(0, exifLines - 1) * (cfg.infoLayout === "grid" ? gridGapV : rowGap)
    : 0;
  const logoBlockH = hasLogo ? Math.max(logoLineH, cfg.logoImageUrl ? logoImageH : 0) : 0;

  let footerContentH = 0;
  if (hasLogo && hasExif && cfg.logoPosition === "center") {
    footerContentH = logoBlockH + Math.round(12 * scaleFactor) + exifBlockH;
  } else {
    footerContentH = Math.max(logoBlockH, exifBlockH);
  }
  const footerH = hasLogo || hasExif ? Math.round(40 * scaleFactor) + footerContentH : 0;

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
  /** Formatted EXIF strings (for original-mode height, which depends on footerH) */
  exifValues?: string[];
  makeFallback?: string;
}

/** Canvas width/height for any canvasMode. */
export function computeCanvasDims(input: CanvasDimsInput): { w: number; h: number } {
  const { cfg, photoWidth, photoHeight } = input;

  if (cfg.canvasMode === "social" && cfg.socialPreset === "instagram") {
    return socialCanvasDims(cfg.socialRatio);
  }
  if (cfg.canvasMode === "fixed") {
    return {
      w: cfg.canvasWidth || photoWidth || 1080,
      h: cfg.canvasHeight || photoHeight || 1080,
    };
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
    exifValues: input.exifValues ?? [],
    makeFallback: input.makeFallback,
  });
  const availW = w - paddingH * 2;
  const pAspect = photoWidth && photoHeight && photoHeight > 0 ? photoWidth / photoHeight : 1;
  const imgH = availW / pAspect;
  return { w, h: Math.round(imgH + paddingTop + paddingBottom + footerH) };
}

/** Scale factor relative to a 1080px base (longer canvas edge). */
export function canvasScaleFactor(w: number, h: number): number {
  return Math.max(w, h) / 1080;
}

export interface LayoutScaleInput {
  cfg: TemplateConfig;
  canvasWidth: number;
  canvasHeight: number;
  photoWidth?: number;
  photoHeight?: number;
}

/**
 * The single layout scale for a canvas. Social/fixed canvases are explicit,
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

// ── Node tree builder ───────────────────────────────────────────────────────

export const buildRenderTree = (payload: RenderPayload): RenderTreeResult => {
  const { photoBase64, exifData, templateConfig, exportOptions, photoWidth, photoHeight } = payload;

  const visibleFields: string[] = templateConfig.visibleFields || [];
  const exifTexts = visibleFields
    .map((field: string) => formatExif(exifData, field))
    .filter((t: string) => t);
  // Resolve canvas dims. For original mode the height depends on footerH, so
  // computeCanvasDims runs the footer estimation internally.
  let { w: canvasWidth, h: canvasHeight } = computeCanvasDims({
    cfg: templateConfig,
    photoWidth: photoWidth || 1080,
    photoHeight: photoHeight || 1080,
    exifValues: exifTexts,
    makeFallback: exifData?.make,
  });

  // For social/fixed the dims above are final; for original they already
  // include the footer. Re-run the footer layout at the resolved scale so the
  // rest of the builder has logo sizes / paddings ready.
  const scaleFactor = layoutScaleFactor({
    cfg: templateConfig,
    canvasWidth,
    canvasHeight,
    photoWidth,
    photoHeight,
  });
  const footer = estimateFooterLayout({
    cfg: templateConfig,
    scaleFactor,
    canvasW: canvasWidth,
    exifValues: exifTexts,
    makeFallback: exifData?.make,
  });
  const { footerH, hasLogo, hasExif, logoTxt, logoImageW, logoImageH, footerPaddingX } = footer;

  const bgColor = templateConfig.backgroundColor || "#ffffff";
  const photoScale = templateConfig.photoScale ?? 0.9;

  const paddingTop = Math.round((templateConfig.paddingTop ?? 0) * scaleFactor);
  const paddingBottom = Math.round((templateConfig.paddingBottom ?? 0) * scaleFactor);
  const paddingH = Math.round((templateConfig.paddingHorizontal ?? 0) * scaleFactor);
  const borderRadius = Math.round((templateConfig.borderRadius ?? 0) * scaleFactor);

  const fontFamily = templateConfig.fontFamily || "Inter, sans-serif";
  const fontSizeBase = templateConfig.fontSize ?? 14;
  const fontSize = Math.round(fontSizeBase * scaleFactor);
  const fontColor = templateConfig.fontColor || "#000000";
  const modelFontSizeBase = templateConfig.modelFontSize ?? 24;
  const modelFontSize = Math.round(modelFontSizeBase * scaleFactor);
  const logoPosition = templateConfig.logoPosition || "center";
  const logoImageUrl: string = templateConfig.logoImageUrl || "";
  const infoLayout = templateConfig.infoLayout || "horizontal";

  const gridGapV = Math.round(4 * scaleFactor);
  const rowGap = Math.round((infoLayout === "list" ? 4 : 10) * scaleFactor);

  const availW = canvasWidth - paddingH * 2;
  const availH = Math.max(1, canvasHeight - footerH - paddingTop - paddingBottom);

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

  const finalW = Math.round(imgW * photoScale);
  const finalH = Math.round(imgH * photoScale);

  const crop = payload.crop;
  const useCover = crop?.fitMode === "cover";
  // In cover mode the photo fills the whole available area (no photoScale inset)
  const boxW = useCover ? Math.round(availW) : finalW;
  const boxH = useCover ? Math.round(availH) : finalH;

  const children: any[] = [];

  const photoNode = (() => {
    if (!useCover) {
      return {
        type: "image",
        src: photoBase64,
        width: boxW,
        height: boxH,
        style: {
          borderRadius,
        },
      };
    }
    // Cover: a clipping container sized to the frame, with the photo absolutely
    // positioned inside it (zoom + pan). Radius lives on the container so the
    // cropped image is clipped to the rounded frame.
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
    return {
      type: "container",
      tagName: "div",
      style: {
        position: "relative",
        width: boxW,
        height: boxH,
        overflow: "hidden",
        borderRadius,
      },
      children: [
        {
          type: "image",
          src: photoBase64,
          width: Math.round(cw),
          height: Math.round(ch),
          style: {
            position: "absolute",
            left: Math.round(left),
            top: Math.round(top),
          },
        },
      ],
    };
  })();

  children.push({
    type: "container",
    tagName: "div",
    style: {
      flex: 1,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      paddingTop,
      paddingBottom,
      paddingLeft: paddingH,
      paddingRight: paddingH,
    },
    children: [photoNode],
  });

  if (hasLogo || hasExif) {
    const footerChildren: any[] = [];
    const mkSpacer = () => ({ type: "container" as const, style: { flex: 1 } });

    // Build logo node: image or text
    const logoNode = logoImageUrl
      ? {
          type: "image" as const,
          src: logoImageUrl,
          width: logoImageW,
          height: logoImageH,
          style: { objectFit: "contain" as const },
        }
      : {
          type: "text" as const,
          text: logoTxt,
          style: {
            fontSize: modelFontSize,
            fontWeight: "bold",
            color: fontColor,
            fontFamily,
          },
        };

    const exifJustify = infoLayout === "horizontal" ? "flex-start" : "center";

    const mkExifText = (text: string) => ({
      type: "text" as const,
      text,
      style: {
        fontSize,
        color: fontColor,
        fontFamily,
      },
    });

    let exifNode: any;
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
          gap: `${gridGapV}px ${Math.round(14 * scaleFactor)}px`,
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
          justifyContent: exifJustify,
          alignItems: "center",
          gap: `${rowGap}px`,
        },
        children: exifTexts.map(mkExifText),
      };
    }

    if (hasLogo && hasExif) {
      if (logoPosition === "center") {
        footerChildren.push({
          type: "container",
          tagName: "div",
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: `${Math.round(12 * scaleFactor)}px`,
            flex: 1,
          },
          children: [logoNode, exifNode],
        });
      } else if (logoPosition === "right") {
        footerChildren.push(exifNode);
        footerChildren.push(mkSpacer());
        footerChildren.push(logoNode);
      } else {
        footerChildren.push(logoNode);
        footerChildren.push(mkSpacer());
        footerChildren.push(exifNode);
      }
    } else if (hasLogo) {
      if (logoPosition === "center") {
        footerChildren.push(mkSpacer());
        footerChildren.push(logoNode);
        footerChildren.push(mkSpacer());
      } else if (logoPosition === "right") {
        footerChildren.push(mkSpacer());
        footerChildren.push(logoNode);
      } else {
        footerChildren.push(logoNode);
        footerChildren.push(mkSpacer());
      }
    } else {
      if (logoPosition === "right") {
        footerChildren.push(mkSpacer());
        footerChildren.push(exifNode);
      } else if (logoPosition === "left") {
        footerChildren.push(exifNode);
      } else {
        footerChildren.push(mkSpacer());
        footerChildren.push(exifNode);
        footerChildren.push(mkSpacer());
      }
    }

    children.push({
      type: "container",
      tagName: "div",
      style: {
        display: "flex",
        alignItems: "center",
        paddingTop: `${Math.round(20 * scaleFactor)}px`,
        paddingBottom: `${Math.round(20 * scaleFactor)}px`,
        paddingLeft: `${footerPaddingX}px`,
        paddingRight: `${footerPaddingX}px`,
        width: "100%",
        boxSizing: "border-box",
      },
      children: footerChildren,
    });
  }

  const nodeTree = {
    type: "container",
    tagName: "div",
    style: {
      display: "flex",
      flexDirection: "column",
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: templateConfig.backgroundGradient ? undefined : bgColor,
      background: templateConfig.backgroundGradient || undefined,
      overflow: "hidden",
    },
    children,
  };

  const format = exportOptions?.format || "png";
  const quality = exportOptions?.quality ?? 95;

  return { nodeTree, width: canvasWidth, height: canvasHeight, format, quality };
};
