import type { GlobalThemeOverrides } from "naive-ui";

/**
 * Theme palettes, indexed by nord-* luminance role (0 = page bg, 1 = raised
 * panel, 2 = control bg, 3 = border, 4..6 = text muted → strong, 8/9 = accent,
 * 11 = danger, 12..15 = accents).
 *
 * main.css declares the same values as `--color-nord-*` for Tailwind; Naive UI
 * needs them as literal colours because it derives hover/pressed shades in JS
 * and cannot read CSS variables. tests/themes.test.ts keeps the two in sync.
 */

export type ThemeId = "graphite" | "nord" | "frost" | "sand" | "dusk";

export interface Palette {
  dark: boolean;
  /** nord-0 … nord-15 */
  colors: readonly string[];
}

export const PALETTES: Record<ThemeId, Palette> = {
  // Neutral grey like a photo editor, so the photo's colour is the only colour on screen
  graphite: {
    dark: true,
    colors: [
      "#1b1b1b",
      "#262626",
      "#303030",
      "#444444",
      "#a1a1a1",
      "#c4c4c4",
      "#ececec",
      "#8cb8e8",
      "#5aa2ee",
      "#4a88d0",
      "#3b6fb0",
      "#e0645c",
      "#e08a4f",
      "#d9bb62",
      "#7cc08a",
      "#b393d6",
    ],
  },
  nord: {
    dark: true,
    colors: [
      "#2e3440",
      "#3b4252",
      "#434c5e",
      "#4c566a",
      "#d8dee9",
      "#e5e9f0",
      "#eceff4",
      "#8fbcbb",
      "#88c0d0",
      "#81a1c1",
      "#5e81ac",
      "#bf616a",
      "#d08770",
      "#ebcb8b",
      "#a3be8c",
      "#b48ead",
    ],
  },
  frost: {
    dark: false,
    colors: [
      "#e7ecf2",
      "#f8fafc",
      "#edf1f6",
      "#cbd5e1",
      "#4a5870",
      "#33415a",
      "#1f2a3a",
      "#0f85a5",
      "#0e7490",
      "#155e75",
      "#3d6ba5",
      "#b8342f",
      "#c2601c",
      "#8f6f1f",
      "#3e8e4e",
      "#8550b4",
    ],
  },
  sand: {
    dark: false,
    colors: [
      "#efe7d9",
      "#faf6ec",
      "#f1e9da",
      "#ddd0b9",
      "#5b4e3c",
      "#4a3f2f",
      "#2e2518",
      "#9a6b2f",
      "#8a5a23",
      "#6f4819",
      "#5b6e96",
      "#a63d32",
      "#b05e23",
      "#84661f",
      "#5c7a43",
      "#735191",
    ],
  },
  dusk: {
    dark: true,
    colors: [
      "#0d0f13",
      "#191c22",
      "#20242c",
      "#2e343e",
      "#b8c0cc",
      "#cad1dc",
      "#edf1f7",
      "#93c5d8",
      "#6fc3de",
      "#57acc9",
      "#7ea6d8",
      "#ef8b96",
      "#e5a271",
      "#d9c07b",
      "#9bd0a5",
      "#c09be0",
    ],
  },
};

/** `#rrggbb` + alpha (0–1) → `rgba()` */
function alpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Linear mix of two `#rrggbb` colours; t = 0 → a, 1 → b */
function mix(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/**
 * Naive UI overrides for a palette: editor density (28px controls, 13px type,
 * 2px corners) plus every colour token mapped onto the nord-* roles. Hover
 * shades step towards the strong text colour, so they read as "lighter" on
 * dark themes and "darker" on light ones.
 */
export function naiveThemeOverrides(id: ThemeId): GlobalThemeOverrides {
  const { colors: c } = PALETTES[id];
  const n = (i: number) => c[i]!;
  const hover = (hex: string) => mix(hex, n(6), 0.18);
  const pressed = (hex: string) => mix(hex, n(0), 0.18);
  const status = (hex: string) => ({
    Color: hex,
    ColorHover: hover(hex),
    ColorPressed: pressed(hex),
    ColorSuppl: hover(hex),
  });
  const prefixed = (name: string, hex: string) =>
    Object.fromEntries(Object.entries(status(hex)).map(([k, v]) => [`${name}${k}`, v]));

  return {
    common: {
      fontFamily: '"IBM Plex Sans", "Noto Sans SC", system-ui, sans-serif',
      fontFamilyMono: '"JetBrains Mono", ui-monospace, monospace',
      fontWeightStrong: "700",
      fontSize: "13px",
      fontSizeMini: "12px",
      fontSizeTiny: "13px",
      fontSizeSmall: "13px",
      fontSizeMedium: "14px",
      heightMini: "18px",
      heightTiny: "28px",
      heightSmall: "32px",
      heightMedium: "36px",
      borderRadius: "2px",
      borderRadiusSmall: "2px",

      ...prefixed("primary", n(8)),
      ...prefixed("info", n(9)),
      ...prefixed("success", n(14)),
      ...prefixed("warning", n(13)),
      ...prefixed("error", n(11)),

      bodyColor: n(0),
      cardColor: n(1),
      modalColor: n(1),
      popoverColor: n(2),
      tableColor: n(1),
      tableHeaderColor: n(2),
      inputColor: n(0),
      inputColorDisabled: n(1),
      actionColor: n(2),
      tabColor: n(2),
      codeColor: n(2),
      buttonColor2: n(2),
      buttonColor2Hover: n(3),
      buttonColor2Pressed: n(3),
      hoverColor: alpha(n(6), 0.07),
      pressedColor: alpha(n(6), 0.12),
      borderColor: n(3),
      dividerColor: n(3),
      closeIconColor: n(4),
      closeIconColorHover: n(6),
      closeColorHover: alpha(n(6), 0.08),
      scrollbarColor: alpha(n(4), 0.35),
      scrollbarColorHover: alpha(n(4), 0.55),

      textColorBase: n(6),
      textColor1: n(6),
      textColor2: n(5),
      textColor3: n(4),
      textColorDisabled: alpha(n(4), 0.5),
      placeholderColor: alpha(n(4), 0.6),
      placeholderColorDisabled: alpha(n(4), 0.4),
      iconColor: n(4),
      iconColorHover: n(6),
      iconColorPressed: n(5),
      iconColorDisabled: alpha(n(4), 0.4),
    },
    Button: {
      fontWeight: "400",
      paddingTiny: "0 10px",
      paddingSmall: "0 12px",
      iconSizeTiny: "15px",
      iconSizeSmall: "16px",
      textColorPrimary: n(0),
      textColorHoverPrimary: n(0),
      textColorPressedPrimary: n(0),
      textColorFocusPrimary: n(0),
    },
    Input: {
      paddingTiny: "0 8px",
      paddingSmall: "0 10px",
      border: `1px solid ${n(3)}`,
      borderHover: `1px solid ${n(4)}`,
      borderFocus: `1px solid ${n(8)}`,
      boxShadowFocus: "none",
    },
    InternalSelection: {
      paddingTiny: "0 26px 0 8px",
      paddingSmall: "0 28px 0 10px",
      border: `1px solid ${n(3)}`,
      borderHover: `1px solid ${n(4)}`,
      borderActive: `1px solid ${n(8)}`,
      borderFocus: `1px solid ${n(8)}`,
      boxShadowActive: "none",
      boxShadowFocus: "none",
      color: n(0),
      colorActive: n(0),
    },
    InternalSelectMenu: {
      color: n(2),
      optionHeightSmall: "32px",
      optionFontSizeSmall: "13px",
      optionColorPending: alpha(n(6), 0.07),
      optionColorActive: alpha(n(8), 0.14),
      optionColorActivePending: alpha(n(8), 0.2),
      optionTextColorActive: n(6),
      groupHeaderTextColor: n(4),
    },
    Tabs: {
      colorSegment: n(0),
      tabColorSegment: n(3),
      tabTextColorSegment: n(4),
      tabTextColorActiveSegment: n(6),
      tabTextColorHoverSegment: n(5),
      tabBorderRadius: "2px",
      tabFontSizeSmall: "13px",
      tabPaddingSmallSegment: "5px 8px",
      tabTextColorLine: n(4),
      tabTextColorActiveLine: n(8),
      tabTextColorHoverLine: n(5),
      barColor: n(8),
      tabBorderColor: "transparent",
      tabGapSmallLine: "0",
      tabPaddingSmallLine: "6px 12px",
    },
    Slider: {
      railHeight: "2px",
      railColor: n(3),
      railColorHover: n(3),
      fillColor: alpha(n(4), 0.6),
      fillColorHover: alpha(n(4), 0.6),
      handleSize: "16px",
      handleColor: n(6),
      handleBoxShadow: "none",
      handleBoxShadowHover: "none",
      handleBoxShadowActive: "none",
      handleBoxShadowFocus: "none",
    },
    Switch: {
      railHeightSmall: "18px",
      railWidthSmall: "34px",
      buttonHeightSmall: "14px",
      buttonWidthSmall: "14px",
      buttonWidthPressedSmall: "18px",
      railColor: n(3),
      railColorActive: n(8),
      buttonColor: n(6),
      buttonBoxShadow: "none",
      boxShadowFocus: `0 0 0 2px ${alpha(n(8), 0.3)}`,
    },
    Checkbox: {
      sizeSmall: "15px",
      fontSizeSmall: "13px",
      borderRadius: "2px",
      color: n(0),
      border: `1px solid ${n(4)}`,
      borderChecked: `1px solid ${n(8)}`,
      colorChecked: n(8),
      checkMarkColor: n(0),
      textColor: n(5),
      boxShadowFocus: `0 0 0 2px ${alpha(n(8), 0.3)}`,
    },
    Tooltip: {
      color: n(6),
      textColor: n(0),
      padding: "5px 10px",
      borderRadius: "2px",
    },
    Popover: {
      color: n(1),
      borderRadius: "2px",
      padding: "0",
      boxShadow: `0 0 0 1px ${n(3)}, 0 8px 24px rgba(0, 0, 0, 0.35)`,
    },
    Card: {
      color: n(1),
      colorModal: n(1),
      borderColor: n(3),
      borderRadius: "3px",
      titleFontSizeSmall: "15px",
      titleFontSizeMedium: "15px",
      paddingMedium: "16px 20px 20px",
    },
    Progress: {
      railColor: n(3),
      fillColor: n(8),
    },
    Alert: {
      borderRadius: "2px",
      fontSize: "13px",
      padding: "10px 12px",
    },
    Message: {
      color: n(2),
      textColor: n(6),
      borderRadius: "2px",
      fontSize: "13px",
      boxShadow: `0 0 0 1px ${n(3)}, 0 8px 24px rgba(0, 0, 0, 0.35)`,
    },
    Divider: {
      color: n(3),
    },
    Upload: {
      draggerColor: n(1),
      draggerBorder: `1px dashed ${n(3)}`,
      draggerBorderHover: `1px dashed ${n(8)}`,
    },
    ColorPicker: {
      panelColor: n(1),
      border: `1px solid ${n(3)}`,
    },
  };
}
