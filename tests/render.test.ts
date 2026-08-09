import { describe, it, expect } from "vitest";
import {
  formatExif,
  formatCaptureDate,
  coverCropRect,
  buildRenderTree,
  computeCanvasDims,
  layoutScaleFactor,
} from "../shared/render";
import type { RenderPayload } from "../shared/types";

const baseCfg: RenderPayload["templateConfig"] = {
  borderRadius: 0,
  backgroundColor: "#FFFFFF",
  photoScale: 1.0,
  paddingTop: 40,
  paddingBottom: 40,
  paddingHorizontal: 40,
  showLogo: false,
  logoPosition: "center",
  infoLayout: "horizontal",
  visibleFields: [],
  fontFamily: "Inter, sans-serif",
  fontSize: 16,
  fontColor: "#333333",
  modelFontSize: 26,
  canvasMode: "original",
};

describe("formatExif", () => {
  it("formats aperture/shutter/iso/focal length", () => {
    expect(formatExif({ fNumber: 2.8 }, "fNumber")).toBe("f/2.8");
    expect(formatExif({ exposureTime: 0.004 }, "exposureTime")).toBe("1/250");
    expect(formatExif({ exposureTime: 2 }, "exposureTime")).toBe('2"');
    expect(formatExif({ iso: 100 }, "iso")).toBe("ISO 100");
    expect(formatExif({ focalLength: 50 }, "focalLength")).toBe("50mm");
    expect(formatExif({ focalLengthIn35mm: 75 }, "focalLengthIn35mm")).toBe("75mm");
  });

  it("prefers exposureTimeFormatted when present", () => {
    expect(formatExif({ exposureTimeFormatted: "1/250" }, "exposureTime")).toBe("1/250");
  });

  it("formats exposure bias with sign", () => {
    expect(formatExif({ exposureBias: 0.3 }, "exposureBias")).toBe("+0.3 EV");
    expect(formatExif({ exposureBias: -1 }, "exposureBias")).toBe("-1 EV");
    expect(formatExif({ exposureBias: 0 }, "exposureBias")).toBe("0 EV");
  });

  it("formats the capture date deterministically (no locale/ICU dependence)", () => {
    const d = new Date(2024, 0, 2, 3, 4, 5);
    expect(formatExif({ dateTimeOriginal: d }, "dateTimeOriginal")).toBe("2024/1/2");
    expect(formatExif({ dateTimeOriginal: "2024-01-02T03:04:05" }, "dateTimeOriginal")).toBe(
      "2024/1/2",
    );
    // same output regardless of how the Date was constructed
    expect(formatExif({ dateTimeOriginal: new Date(2024, 0, 2) }, "dateTimeOriginal")).toBe(
      "2024/1/2",
    );
  });

  it("formats GPS coordinates when both are present (regression: was silently empty)", () => {
    expect(formatExif({ latitude: 50.1234567, longitude: 8.6543219 }, "gps")).toBe(
      "50.123457, 8.654322",
    );
    expect(formatExif({ latitude: 50.1 }, "gps")).toBe("");
    expect(formatExif({}, "gps")).toBe("");
  });

  it("returns empty for missing fields", () => {
    expect(formatExif({}, "model")).toBe("");
    expect(formatExif(undefined, "model")).toBe("");
    expect(formatExif({ iso: 0 }, "iso")).toBe("");
  });
});

describe("formatCaptureDate", () => {
  it("is date-only and zero-padding free, matching the zh-CN footer look", () => {
    expect(formatCaptureDate(new Date(2024, 0, 2))).toBe("2024/1/2");
    expect(formatCaptureDate(new Date(2024, 11, 31))).toBe("2024/12/31");
  });

  it("returns '' for invalid input", () => {
    expect(formatCaptureDate(new Date("nope"))).toBe("");
    expect(formatCaptureDate("nope")).toBe("");
  });
});

describe("coverCropRect", () => {
  it("centers a wide photo in a tall box", () => {
    const r = coverCropRect(1000, 800, 2, 1, 0, 0);
    expect(r.width).toBe(1600); // boxH * aspect
    expect(r.height).toBe(800);
    expect(r.left).toBe(-300); // overflow centered
    expect(r.top).toBeCloseTo(0);
  });

  it("zooms from the cover-fit base", () => {
    const r = coverCropRect(1000, 800, 2, 2, 0, 0);
    expect(r.width).toBe(3200);
    expect(r.left).toBe(-1100);
  });

  it("clamps scale >= 1 and offsets to [-1, 1]", () => {
    const r = coverCropRect(1000, 800, 2, 0.5, 5, -5);
    expect(r.width).toBe(1600); // scale clamped to 1
    expect(r.left).toBe(-600); // offsetX clamped to 1 → right edge visible
    expect(r.top).toBeCloseTo(0); // no vertical overflow
  });

  it("never produces negative sizes", () => {
    const r = coverCropRect(1, 1, 0.5, 1, 0, 0);
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
  });
});

describe("buildRenderTree", () => {
  it("social instagram 4:5 → 1080×1350", () => {
    const { width, height } = buildRenderTree({
      photoBase64: "data:image/jpeg;base64,x",
      templateConfig: {
        ...baseCfg,
        canvasMode: "social",
        socialPreset: "instagram",
        socialRatio: "4:5",
      },
      photoWidth: 4000,
      photoHeight: 3000,
    });
    expect([width, height]).toEqual([1080, 1350]);
  });

  it("social custom ratio 7:5 → 1080×771", () => {
    const { width, height } = buildRenderTree({
      photoBase64: "data:image/jpeg;base64,x",
      templateConfig: {
        ...baseCfg,
        canvasMode: "social",
        socialPreset: "instagram",
        socialRatio: "7:5",
      },
      photoWidth: 4000,
      photoHeight: 3000,
    });
    expect([width, height]).toEqual([1080, Math.round((1080 * 5) / 7)]);
  });

  it("social falls back to 4:5 for garbage ratios", () => {
    const { width, height } = buildRenderTree({
      photoBase64: "data:image/jpeg;base64,x",
      templateConfig: {
        ...baseCfg,
        canvasMode: "social",
        socialPreset: "instagram",
        socialRatio: "x:y",
      },
      photoWidth: 4000,
      photoHeight: 3000,
    });
    expect([width, height]).toEqual([1080, 1350]);
  });

  it("original mode (portrait): scale is photo-anchored so preview == export (regression)", () => {
    const cfg = {
      ...baseCfg,
      showLogo: true,
      logoText: "TESTCAM",
      visibleFields: ["model", "fNumber", "exposureTime", "iso", "focalLength"],
    };
    const exifValues = ["X-1", "f/2.8", "1/250", "ISO 400", "50mm"];
    const { width, height } = buildRenderTree({
      photoBase64: "data:image/jpeg;base64,x",
      exifData: {
        model: "X-1",
        fNumber: 2.8,
        exposureTime: 0.004,
        iso: 400,
        focalLength: 50,
        make: "TestCam",
      },
      templateConfig: cfg,
      photoWidth: 3000,
      photoHeight: 4000,
    });
    // Canvas dims must come out of the SAME function the preview uses
    const dims = computeCanvasDims({
      cfg,
      photoWidth: 3000,
      photoHeight: 4000,
      exifValues,
      makeFallback: "TestCam",
    });
    expect([width, height]).toEqual([dims.w, dims.h]);
    // ...and the scale must be anchored to the photo's longer edge (4000/1080),
    // NOT recomputed from the footer-inflated canvas height (4317/1080).
    expect(
      layoutScaleFactor({
        cfg,
        canvasWidth: dims.w,
        canvasHeight: dims.h,
        photoWidth: 3000,
        photoHeight: 4000,
      }),
    ).toBeCloseTo(4000 / 1080);
  });

  it("original mode: auto-height = photo area + scaled paddings", () => {
    const { width, height } = buildRenderTree({
      photoBase64: "data:image/jpeg;base64,x",
      templateConfig: baseCfg,
      photoWidth: 4000,
      photoHeight: 3000,
    });
    expect(width).toBe(4000);
    // scaleFactor = 4000/1080 ≈ 3.704 → paddings 40→148 each; image 3704×2778
    expect(height).toBe(3074);
  });

  it("adds a footer only when there is logo or visible exif", () => {
    const noFooter = buildRenderTree({
      photoBase64: "data:image/jpeg;base64,x",
      templateConfig: baseCfg,
      photoWidth: 1000,
      photoHeight: 1000,
    });
    expect(noFooter.nodeTree.children.length).toBe(1);

    const withFooter = buildRenderTree({
      photoBase64: "data:image/jpeg;base64,x",
      templateConfig: { ...baseCfg, showLogo: false, visibleFields: ["model", "fNumber", "iso"] },
      exifData: { model: "EOS R5", fNumber: 2.8, iso: 100 },
      photoWidth: 1000,
      photoHeight: 1000,
    });
    const footer = withFooter.nodeTree.children[1];
    const texts = JSON.stringify(footer);
    expect(texts).toContain("EOS R5");
    expect(texts).toContain("f/2.8");
    expect(texts).toContain("ISO 100");
  });

  it("renders the canonical date string into the footer", () => {
    const { nodeTree } = buildRenderTree({
      photoBase64: "data:image/jpeg;base64,x",
      templateConfig: { ...baseCfg, visibleFields: ["dateTimeOriginal"] },
      exifData: { dateTimeOriginal: new Date(2024, 0, 2, 3, 4, 5) },
      photoWidth: 1000,
      photoHeight: 1000,
    });
    expect(JSON.stringify(nodeTree)).toContain("2024/1/2");
    expect(JSON.stringify(nodeTree)).not.toContain("03:04:05");
  });

  it("cover mode clips via a rounded overflow-hidden container (radius scaled to canvas)", () => {
    const { nodeTree } = buildRenderTree({
      photoBase64: "data:image/jpeg;base64,x",
      templateConfig: {
        ...baseCfg,
        borderRadius: 14,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
      },
      photoWidth: 2000,
      photoHeight: 1000,
      crop: { fitMode: "cover", scale: 1.5, offsetX: 0.5, offsetY: 0 },
    });
    const frame = nodeTree.children[0].children[0];
    expect(frame.type).toBe("container");
    expect(frame.style.overflow).toBe("hidden");
    expect(frame.style.borderRadius).toBe(Math.round(14 * (2000 / 1080))); // 26
    expect(frame.children[0].type).toBe("image");
    expect(frame.children[0].style.position).toBe("absolute");
    expect(frame.children[0].width).toBeGreaterThan(frame.style.width);
  });

  it("defaults to png @ quality 95 and honors exportOptions", () => {
    const dflt = buildRenderTree({
      photoBase64: "data:image/jpeg;base64,x",
      templateConfig: baseCfg,
      photoWidth: 1000,
      photoHeight: 1000,
    });
    expect(dflt.format).toBe("png");
    expect(dflt.quality).toBe(95);

    const custom = buildRenderTree({
      photoBase64: "data:image/jpeg;base64,x",
      templateConfig: baseCfg,
      exportOptions: { format: "jpeg", quality: 80 },
      photoWidth: 1000,
      photoHeight: 1000,
    });
    expect(custom.format).toBe("jpeg");
    expect(custom.quality).toBe(80);
  });
});
