// Editor-style density and shape for Nuxt UI. Colours come from the nord-*
// luminance roles mapped in main.css, so only size and corner overrides live here.
export default defineAppConfig({
  ui: {
    colors: { primary: "blue", neutral: "neutral" },
    button: {
      slots: { base: "font-medium" },
      defaultVariants: { size: "xs" },
    },
    input: { defaultVariants: { size: "xs" } },
    inputNumber: { defaultVariants: { size: "xs" } },
    selectMenu: { defaultVariants: { size: "xs" } },
    tabs: { defaultVariants: { size: "xs" } },
    checkbox: {
      slots: { base: "rounded-[2px]" },
      defaultVariants: { size: "xs" },
    },
    switch: {
      slots: { base: "rounded-[3px]", thumb: "rounded-[2px] shadow-none" },
      defaultVariants: { size: "xs" },
    },
    tooltip: { slots: { content: "rounded-[2px]" } },
  },
});
