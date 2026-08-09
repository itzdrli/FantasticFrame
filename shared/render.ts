/**
 * Render node tree builder — shared between frontend and backend
 * (used by server/api/render.post.ts and the browser WASM renderer)
 * Note: keep the structure in sync with the types in app/types/index.ts
 */

export interface SharedExifData {
  make?: string;
  model?: string;
  fNumber?: number;
  exposureTime?: number;
  exposureTimeFormatted?: string;
  iso?: number;
  focalLength?: number;
  focalLengthIn35mm?: number;
  dateTimeOriginal?: Date | string;
  lensModel?: string;
  latitude?: number;
  longitude?: number;
  exposureBias?: number;
}

export interface SharedTemplateConfig {
  borderRadius: number;
  backgroundColor: string;
  backgroundGradient?: string;
  photoScale: number;
  paddingTop: number;
  paddingBottom: number;
  paddingHorizontal: number;
  showLogo: boolean;
  logoPosition: "left" | "center" | "right";
  logoText?: string;
  logoImageUrl?: string;
  logoScale?: number;
  logoAspect?: number;
  logoWidth?: number;
  logoHeight?: number;
  infoLayout: "grid" | "list" | "horizontal";
  visibleFields: string[];
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  modelFontSize: number;
  canvasMode: "original" | "fixed" | "social";
  canvasWidth?: number;
  canvasHeight?: number;
  socialPreset?: "instagram";
  /** Output aspect ratio (W:H), arbitrary integer pair (e.g. "1:1", "16:9"). */
  socialRatio?: string;
}

export type SharedExportFormat = "png" | "jpeg" | "webp";

export interface SharedPhotoCrop {
  fitMode?: "contain" | "cover";
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface SharedRenderPayload {
  photoBase64: string;
  exifData?: SharedExifData;
  templateConfig: SharedTemplateConfig;
  exportOptions?: { format?: SharedExportFormat; quality?: number };
  photoWidth?: number;
  photoHeight?: number;
  /** Per-photo crop/zoom applied inside the frame */
  crop?: SharedPhotoCrop;
}

export interface RenderTreeResult {
  nodeTree: Record<string, any>;
  width: number;
  height: number;
  format: SharedExportFormat;
  quality: number;
}

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

export interface CropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

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

export const buildRenderTree = (payload: SharedRenderPayload): RenderTreeResult => {
  const { photoBase64, exifData, templateConfig, exportOptions, photoWidth, photoHeight } = payload;

  let canvasWidth = photoWidth || 1080;
  let canvasHeight = photoHeight || 1080;

  if (templateConfig.canvasMode === "social" && templateConfig.socialPreset) {
    // Known ratios → pixel-exact heights; any other "W:H" pair is computed
    // from the 1080-wide canvas (h = 1080 × H / W). Keeps the renderer
    // forward-compatible with arbitrary custom ratios entered in the UI.
    const knownHeights: Record<string, number> = {
      "1:1": 1080,
      "4:5": 1350,
      "5:4": 864,
      "3:4": 1440,
      "4:3": 810,
      "16:9": 608,
      "9:16": 1920,
      "21:9": 463,
      "9:21": 2520,
      "1.91:1": 565,
      "1:1.91": 2063,
    };
    const computeHeight = (ratio?: string): number => {
      if (!ratio) return 1350;
      if (knownHeights[ratio]) return knownHeights[ratio];
      const parts = ratio.split(":").map(Number);
      const w = parts[0];
      const h = parts[1];
      if (parts.length === 2 && w !== undefined && h !== undefined && w > 0 && h > 0) {
        return Math.round((1080 * h) / w);
      }
      return 1350;
    };
    switch (templateConfig.socialPreset) {
      case "instagram":
        canvasWidth = 1080;
        canvasHeight = computeHeight(templateConfig.socialRatio);
        break;
    }
  } else if (templateConfig.canvasMode === "fixed") {
    canvasWidth = templateConfig.canvasWidth || photoWidth || 1080;
    canvasHeight = templateConfig.canvasHeight || photoHeight || 1080;
  }

  // Scale all layout and typography parameters relative to a 1080px base canvas.
  // Use the longer edge so portrait images get the same proportions as landscape ones.
  const scaleFactor = Math.max(canvasWidth, canvasHeight) / 1080;

  const bgColor = templateConfig.backgroundColor || "#ffffff";
  const photoScale = templateConfig.photoScale ?? 0.9;

  // Scale all layout and typography parameters relative to a 1080px base canvas
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
  const showLogo = templateConfig.showLogo !== false;
  const logoPosition = templateConfig.logoPosition || "center";
  const logoTxt = templateConfig.logoText || (exifData?.make || "").toUpperCase();
  const logoImageUrl: string = templateConfig.logoImageUrl || "";
  const infoLayout = templateConfig.infoLayout || "horizontal";

  const visibleFields: string[] = templateConfig.visibleFields || [];
  const exifTexts = visibleFields
    .map((field: string) => formatExif(exifData, field))
    .filter((t: string) => t);

  const hasLogo = showLogo && (!!logoImageUrl || !!logoTxt);
  const hasExif = exifTexts.length > 0;

  const logoLineH = Math.ceil(modelFontSize * 1.4);
  const exifLineH = Math.ceil(fontSize * 1.4);
  const footerPaddingX = Math.max(Math.round(20 * scaleFactor), paddingH);
  const footerInnerW = Math.max(1, canvasWidth - footerPaddingX * 2);

  // Image-logo dimensions.
  // Preferred model: a single `logoScale` (%) applied to a baseline height of
  // `modelFontSizeBase * 1.4`, with the width derived from the image's
  // intrinsic `logoAspect` (w/h). Width is capped to the footer inner width so
  // the logo can never overflow (which would otherwise shift its position and
  // make the Layout > Position button appear to do nothing). The capped width
  // back-computes the displayed height, so the footer reserves exactly the
  // height the image actually occupies — no top/bottom whitespace.
  // Legacy fallback: if `logoAspect` is missing (old stored photo), fall back
  // to the explicit `logoWidth`/`logoHeight` pair.
  let logoImageW: number;
  let logoImageH: number;
  if (logoImageUrl && templateConfig.logoAspect && templateConfig.logoAspect > 0) {
    const scalePct = templateConfig.logoScale ?? 100;
    const baselineH = modelFontSizeBase * 1.4;
    let h = Math.round(baselineH * scaleFactor * (scalePct / 100));
    let w = Math.round(h * templateConfig.logoAspect);
    if (w > footerInnerW) {
      w = footerInnerW;
      h = Math.round(w / templateConfig.logoAspect);
    }
    logoImageW = w;
    logoImageH = h;
  } else {
    logoImageW = Math.round((templateConfig.logoWidth ?? modelFontSizeBase * 5) * scaleFactor);
    logoImageH = Math.round((templateConfig.logoHeight ?? modelFontSizeBase * 1.4) * scaleFactor);
  }

  // Estimate how many lines the EXIF block occupies so the footer never overflows
  let exifLines = hasExif ? 1 : 0;
  if (infoLayout === "list") {
    exifLines = exifTexts.length;
  } else if (infoLayout === "grid") {
    exifLines = Math.ceil(exifTexts.length / 2);
  } else if (hasExif) {
    const rowGap = Math.round(10 * scaleFactor);
    const logoW = logoImageUrl ? logoImageW : Math.ceil(logoTxt.length * modelFontSize * 0.7);
    const availExifW =
      hasLogo && logoPosition !== "center"
        ? Math.max(1, footerInnerW - logoW - Math.round(16 * scaleFactor))
        : footerInnerW;
    let curW = 0;
    for (const t of exifTexts) {
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
  const rowGap = Math.round((infoLayout === "list" ? 4 : 10) * scaleFactor);
  const exifBlockH = hasExif
    ? exifLines * exifLineH +
      Math.max(0, exifLines - 1) * (infoLayout === "grid" ? gridGapV : rowGap)
    : 0;
  const logoBlockH = hasLogo ? Math.max(logoLineH, logoImageUrl ? logoImageH : 0) : 0;

  let footerContentH = 0;
  if (hasLogo && hasExif && logoPosition === "center") {
    footerContentH = logoBlockH + Math.round(12 * scaleFactor) + exifBlockH;
  } else {
    footerContentH = Math.max(logoBlockH, exifBlockH);
  }
  const footerH = hasLogo || hasExif ? Math.round(40 * scaleFactor) + footerContentH : 0;

  // Adjust canvasHeight for 'original' mode to prevent letterboxing
  if (templateConfig.canvasMode !== "social" && templateConfig.canvasMode !== "fixed") {
    const pAspect = photoWidth && photoHeight && photoHeight > 0 ? photoWidth / photoHeight : 1;
    const availW = canvasWidth - paddingH * 2;
    const imgH = availW / pAspect;
    canvasHeight = Math.round(imgH + paddingTop + paddingBottom + footerH);
  }

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
