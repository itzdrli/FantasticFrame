/**
 * Brand logo library — single-colour SVGs served from /logos/<id>.svg (see
 * public/logos/SOURCES.md for where each one comes from). They are recoloured
 * like any pasted SVG logo, and `matchLogoId` picks one from a photo's EXIF
 * make for templates with `logoAuto`.
 */

export interface LogoMeta {
  id: string;
  /** Display name (brand names are not translated) */
  name: string;
  group: "camera" | "phone";
  /** Matched against the EXIF Make; absent = never auto-picked */
  make?: RegExp;
}

export const LOGO_LIBRARY: readonly LogoMeta[] = [
  { id: "canon", name: "Canon", group: "camera", make: /canon/i },
  { id: "nikon", name: "Nikon", group: "camera", make: /nikon/i },
  { id: "sony", name: "Sony", group: "camera", make: /sony/i },
  { id: "fujifilm", name: "Fujifilm", group: "camera", make: /fuji/i },
  { id: "leica", name: "Leica", group: "camera", make: /leica/i },
  { id: "hasselblad", name: "Hasselblad", group: "camera", make: /hasselblad/i },
  // Panasonic cameras are branded LUMIX; the corporate mark stays pickable
  { id: "lumix", name: "Lumix", group: "camera", make: /panasonic|lumix/i },
  { id: "panasonic", name: "Panasonic", group: "camera" },
  { id: "olympus", name: "Olympus", group: "camera", make: /olympus|om digital/i },
  { id: "pentax", name: "Pentax", group: "camera", make: /pentax/i },
  { id: "ricoh", name: "Ricoh", group: "camera", make: /ricoh/i },
  { id: "sigma", name: "Sigma", group: "camera", make: /sigma/i },
  { id: "dji", name: "DJI", group: "camera", make: /dji/i },
  { id: "insta360", name: "Insta360", group: "camera", make: /insta360|arashi/i },
  { id: "kodak", name: "Kodak", group: "camera", make: /kodak/i },
  { id: "polaroid", name: "Polaroid", group: "camera", make: /polaroid/i },
  { id: "apple", name: "Apple", group: "phone", make: /apple/i },
  { id: "samsung", name: "Samsung", group: "phone", make: /samsung/i },
  { id: "xiaomi", name: "Xiaomi", group: "phone", make: /xiaomi|redmi/i },
  { id: "huawei", name: "Huawei", group: "phone", make: /huawei/i },
  { id: "honor", name: "Honor", group: "phone", make: /honor/i },
  { id: "oppo", name: "OPPO", group: "phone", make: /oppo/i },
  { id: "vivo", name: "vivo", group: "phone", make: /vivo/i },
  { id: "oneplus", name: "OnePlus", group: "phone", make: /oneplus/i },
  { id: "google", name: "Google", group: "phone", make: /google/i },
  { id: "motorola", name: "Motorola", group: "phone", make: /motorola/i },
  { id: "meizu", name: "Meizu", group: "phone", make: /meizu/i },
  { id: "asus", name: "ASUS", group: "phone", make: /asus/i },
];

export const logoUrl = (id: string) => `/logos/${id}.svg`;

/** Library logo for a camera, or undefined when the make is unknown */
export function matchLogoId(make?: string, model?: string): string | undefined {
  if (!make) return undefined;
  // Ricoh Imaging makes both lines; Pentax bodies say so in the model name
  if (/ricoh/i.test(make) && /pentax/i.test(model ?? "")) return "pentax";
  return LOGO_LIBRARY.find((l) => l.make?.test(make))?.id;
}
