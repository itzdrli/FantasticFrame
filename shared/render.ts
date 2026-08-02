/**
 * 渲染节点树构建逻辑 — 前后端共用（server/api/render.post.ts 与浏览器 WASM 渲染共用）
 * 注意：与 app/types/index.ts 中的类型保持结构一致
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
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  backgroundColor: string;
  backgroundGradient?: string;
  photoScale: number;
  paddingTop: number;
  paddingBottom: number;
  paddingHorizontal: number;
  showLogo: boolean;
  logoPosition: 'left' | 'center' | 'right';
  logoText?: string;
  logoImageUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  infoLayout: 'grid' | 'list' | 'horizontal';
  visibleFields: string[];
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  modelFontSize: number;
  canvasMode: 'original' | 'fixed' | 'social';
  canvasWidth?: number;
  canvasHeight?: number;
  socialPreset?: 'instagram' | 'xiaohongshu' | 'wechat' | 'weibo';
  socialRatio?: '1:1' | '4:5' | '3:4' | '1.91:1' | '5:4' | '4:3' | '1:1.91';
}

export type SharedExportFormat = 'png' | 'jpeg' | 'webp';

export interface SharedRenderPayload {
  photoBase64: string;
  exifData?: SharedExifData;
  templateConfig: SharedTemplateConfig;
  exportOptions?: { format?: SharedExportFormat; quality?: number };
  photoWidth?: number;
  photoHeight?: number;
}

export interface RenderTreeResult {
  nodeTree: Record<string, any>;
  width: number;
  height: number;
  format: SharedExportFormat;
  quality: number;
}

export const formatExif = (data: any, field: string): string => {
  if (!data) return '';
  switch (field) {
    case 'fNumber':
      return data.fNumber ? `f/${data.fNumber}` : '';
    case 'exposureTime':
      return data.exposureTimeFormatted || (data.exposureTime ? (data.exposureTime < 1 ? `1/${Math.round(1 / data.exposureTime)}` : `${data.exposureTime}"`) : '');
    case 'iso':
      return data.iso ? `ISO ${data.iso}` : '';
    case 'focalLength':
      return data.focalLength ? `${data.focalLength}mm` : '';
    case 'focalLengthIn35mm':
      return data.focalLengthIn35mm ? `${data.focalLengthIn35mm}mm` : '';
    case 'exposureBias':
      return data.exposureBias !== undefined ? `${data.exposureBias > 0 ? '+' : ''}${data.exposureBias} EV` : '';
    case 'dateTimeOriginal':
      return data.dateTimeOriginal ? new Date(data.dateTimeOriginal).toLocaleString('zh-CN', { hour12: false }) : '';
    case 'make':
      return data.make || '';
    case 'model':
      return data.model || '';
    case 'lensModel':
      return data.lensModel || '';
    default:
      return data[field] || '';
  }
};

export const buildRenderTree = (payload: SharedRenderPayload): RenderTreeResult => {
  const { photoBase64, exifData, templateConfig, exportOptions, photoWidth, photoHeight } = payload;

  let canvasWidth = photoWidth || 1080;
  let canvasHeight = photoHeight || 1080;

  if (templateConfig.canvasMode === 'social' && templateConfig.socialPreset) {
    const instagramHeights: Record<string, number> = {
      '1:1': 1080,
      '4:5': 1350,
      '5:4': 864,
      '3:4': 1440,
      '4:3': 810,
      '1.91:1': 565,
      '1:1.91': 2063,
    };
    switch (templateConfig.socialPreset) {
      case 'instagram':
        canvasWidth = 1080;
        canvasHeight = instagramHeights[templateConfig.socialRatio || '4:5'] || 1350;
        break;
      case 'xiaohongshu':
        canvasWidth = 1080;
        canvasHeight = 1440;
        break;
      case 'wechat':
        canvasWidth = 1080;
        canvasHeight = 1920;
        break;
      case 'weibo':
        canvasWidth = 1080;
        canvasHeight = 1080;
        break;
    }
  } else if (templateConfig.canvasMode === 'fixed') {
    canvasWidth = templateConfig.canvasWidth || photoWidth || 1080;
    canvasHeight = templateConfig.canvasHeight || photoHeight || 1080;
  }

  // Scale all layout and typography parameters relative to a 1080px base canvas.
  // Use the longer edge so portrait images get the same proportions as landscape ones.
  const scaleFactor = Math.max(canvasWidth, canvasHeight) / 1080;

  const bgColor = templateConfig.backgroundColor || '#ffffff';
  const photoScale = templateConfig.photoScale ?? 0.9;

  // Scale all layout and typography parameters relative to a 1080px base canvas
  const paddingTop = Math.round((templateConfig.paddingTop ?? 0) * scaleFactor);
  const paddingBottom = Math.round((templateConfig.paddingBottom ?? 0) * scaleFactor);
  const paddingH = Math.round((templateConfig.paddingHorizontal ?? 0) * scaleFactor);
  const borderW = Math.round((templateConfig.borderWidth ?? 0) * scaleFactor);
  const borderColor = templateConfig.borderColor || '#ffffff';
  const borderRadius = Math.round((templateConfig.borderRadius ?? 0) * scaleFactor);

  const fontFamily = templateConfig.fontFamily || 'Inter, sans-serif';
  const fontSizeBase = templateConfig.fontSize ?? 14;
  const fontSize = Math.round(fontSizeBase * scaleFactor);
  const fontColor = templateConfig.fontColor || '#000000';
  const modelFontSizeBase = templateConfig.modelFontSize ?? 24;
  const modelFontSize = Math.round(modelFontSizeBase * scaleFactor);
  const showLogo = templateConfig.showLogo !== false;
  const logoPosition = templateConfig.logoPosition || 'center';
  const logoTxt = templateConfig.logoText || (exifData?.make || '').toUpperCase();
  const logoImageUrl: string = templateConfig.logoImageUrl || '';
  const logoImageW = Math.round((templateConfig.logoWidth ?? modelFontSizeBase * 5) * scaleFactor);
  const logoImageH = Math.round((templateConfig.logoHeight ?? modelFontSizeBase * 1.4) * scaleFactor);
  const infoLayout = templateConfig.infoLayout || 'horizontal';

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

  // Estimate how many lines the EXIF block occupies so the footer never overflows
  let exifLines = hasExif ? 1 : 0;
  if (infoLayout === 'list') {
    exifLines = exifTexts.length;
  } else if (infoLayout === 'grid') {
    exifLines = Math.ceil(exifTexts.length / 2);
  } else if (hasExif) {
    const rowGap = Math.round(10 * scaleFactor);
    const logoW = logoImageUrl ? logoImageW : Math.ceil(logoTxt.length * modelFontSize * 0.7);
    const availExifW = hasLogo && logoPosition !== 'center'
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
  const rowGap = Math.round((infoLayout === 'list' ? 4 : 10) * scaleFactor);
  const exifBlockH = hasExif
    ? exifLines * exifLineH + Math.max(0, exifLines - 1) * (infoLayout === 'grid' ? gridGapV : rowGap)
    : 0;
  const logoBlockH = hasLogo ? Math.max(logoLineH, logoImageUrl ? logoImageH : 0) : 0;

  let footerContentH = 0;
  if (hasLogo && hasExif && logoPosition === 'center') {
    footerContentH = logoBlockH + Math.round(12 * scaleFactor) + exifBlockH;
  } else {
    footerContentH = Math.max(logoBlockH, exifBlockH);
  }
  const footerH = hasLogo || hasExif ? Math.round(40 * scaleFactor) + footerContentH : 0;

  // Adjust canvasHeight for 'original' mode to prevent letterboxing
  if (templateConfig.canvasMode !== 'social' && templateConfig.canvasMode !== 'fixed') {
    const pAspect = photoWidth && photoHeight && photoHeight > 0 ? photoWidth / photoHeight : 1;
    const availW = canvasWidth - paddingH * 2;
    const imgH = availW / pAspect;
    canvasHeight = Math.round(imgH + paddingTop + paddingBottom + footerH);
  }

  const availW = canvasWidth - paddingH * 2;
  const availH = Math.max(1, canvasHeight - footerH - paddingTop - paddingBottom);

  const pAspect = photoWidth && photoHeight && photoHeight > 0
    ? photoWidth / photoHeight
    : 1;

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

  const children: any[] = [];

  children.push({
    type: 'container',
    tagName: 'div',
    style: {
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop,
      paddingBottom,
      paddingLeft: paddingH,
      paddingRight: paddingH,
    },
    children: [
      {
        type: 'image',
        src: photoBase64,
        width: finalW,
        height: finalH,
        style: {
          borderWidth: borderW,
          borderColor,
          borderStyle: borderW > 0 ? 'solid' : undefined,
          borderRadius,
        },
      },
    ],
  });

  if (hasLogo || hasExif) {
    const footerChildren: any[] = [];
    const mkSpacer = () => ({ type: 'container' as const, style: { flex: 1 } });

    // Build logo node: image or text
    const logoNode = logoImageUrl
      ? {
          type: 'image' as const,
          src: logoImageUrl,
          width: logoImageW,
          height: logoImageH,
          style: { objectFit: 'contain' as const },
        }
      : {
          type: 'text' as const,
          text: logoTxt,
          style: {
            fontSize: modelFontSize,
            fontWeight: 'bold',
            color: fontColor,
            fontFamily,
          },
        };

    const exifJustify = infoLayout === 'horizontal' ? 'flex-start' : 'center';

    const mkExifText = (text: string) => ({
      type: 'text' as const,
      text,
      style: {
        fontSize,
        color: fontColor,
        fontFamily,
      },
    });

    let exifNode: any;
    if (infoLayout === 'list') {
      exifNode = {
        type: 'container',
        tagName: 'div',
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: `${rowGap}px`,
        },
        children: exifTexts.map(mkExifText),
      };
    } else if (infoLayout === 'grid') {
      exifNode = {
        type: 'container',
        tagName: 'div',
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, auto)',
          justifyContent: 'center',
          alignItems: 'center',
          gap: `${gridGapV}px ${Math.round(14 * scaleFactor)}px`,
        },
        children: exifTexts.map(mkExifText),
      };
    } else {
      exifNode = {
        type: 'container',
        tagName: 'div',
        style: {
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: exifJustify,
          alignItems: 'center',
          gap: `${rowGap}px`,
        },
        children: exifTexts.map(mkExifText),
      };
    }

    if (hasLogo && hasExif) {
      if (logoPosition === 'center') {
        footerChildren.push({
          type: 'container',
          tagName: 'div',
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: `${Math.round(12 * scaleFactor)}px`,
            flex: 1,
          },
          children: [logoNode, exifNode],
        });
      } else if (logoPosition === 'right') {
        footerChildren.push(exifNode);
        footerChildren.push(mkSpacer());
        footerChildren.push(logoNode);
      } else {
        footerChildren.push(logoNode);
        footerChildren.push(mkSpacer());
        footerChildren.push(exifNode);
      }
    } else if (hasLogo) {
      if (logoPosition === 'center') {
        footerChildren.push(mkSpacer());
        footerChildren.push(logoNode);
        footerChildren.push(mkSpacer());
      } else if (logoPosition === 'right') {
        footerChildren.push(mkSpacer());
        footerChildren.push(logoNode);
      } else {
        footerChildren.push(logoNode);
        footerChildren.push(mkSpacer());
      }
    } else {
      if (logoPosition === 'right') {
        footerChildren.push(mkSpacer());
        footerChildren.push(exifNode);
      } else if (logoPosition === 'left') {
        footerChildren.push(exifNode);
      } else {
        footerChildren.push(mkSpacer());
        footerChildren.push(exifNode);
        footerChildren.push(mkSpacer());
      }
    }

    children.push({
      type: 'container',
      tagName: 'div',
      style: {
        display: 'flex',
        alignItems: 'center',
        paddingTop: `${Math.round(20 * scaleFactor)}px`,
        paddingBottom: `${Math.round(20 * scaleFactor)}px`,
        paddingLeft: `${footerPaddingX}px`,
        paddingRight: `${footerPaddingX}px`,
        width: '100%',
        boxSizing: 'border-box',
      },
      children: footerChildren,
    });
  }

  const nodeTree = {
    type: 'container',
    tagName: 'div',
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: templateConfig.backgroundGradient ? undefined : bgColor,
      background: templateConfig.backgroundGradient || undefined,
      overflow: 'hidden',
    },
    children,
  };

  const format = exportOptions?.format || 'png';
  const quality = exportOptions?.quality ?? 95;

  return { nodeTree, width: canvasWidth, height: canvasHeight, format, quality };
};
