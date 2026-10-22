<script setup lang="ts">
import { computed, ref } from "vue";
import { socialCanvasDims } from "~~/shared/render";

const { overrides, resolvedConfig, update } = useSelectedTemplate();

const canvasMode = computed({
  get: () => overrides.value.canvasMode ?? resolvedConfig.value?.canvasMode ?? "original",
  set: (v) => update("canvasMode", v),
});
const socialRatio = computed({
  get: () => overrides.value.socialRatio ?? resolvedConfig.value?.socialRatio ?? "4:5",
  set: (v) => update("socialRatio", v),
});

// Preset ratios (landscape form only — use "Invert Ratio" for the portrait
// counterpart, e.g. 3:4 → 4:3). Keeps the button grid short while still
// covering every common camera/screen shape via a single invert tap.
const socialRatios: { label: string; value: string }[] = [
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "3:4", value: "3:4" },
  { label: "16:9", value: "16:9" },
  { label: "21:9", value: "21:9" },
  { label: "1.91:1", value: "1.91:1" },
];

// Custom-ratio inputs. They mirror `socialRatio` when the current ratio is one
// of the presets' integer form; otherwise the user types new numbers and hits
// Apply. Keeping the W and H as separate number inputs (instead of a single
// "W:H" text field) avoids mid-edit states like "16:" that would be invalid.
const customW = ref<number | null>(null);
const customH = ref<number | null>(null);

const applyCustomRatio = () => {
  // Whole numbers 1–99: the export API only accepts ratios like "4:5"
  const w = Math.round(customW.value ?? 0);
  const h = Math.round(customH.value ?? 0);
  if (w > 0 && h > 0) {
    socialRatio.value = `${Math.min(99, w)}:${Math.min(99, h)}`;
  }
};

const socialDimsText = computed(() => {
  const { h } = socialCanvasDims(socialRatio.value);
  return `${socialRatio.value} → 1080×${h}`;
});

function invertSocialRatio() {
  const [a, b] = socialRatio.value.split(":");
  socialRatio.value = `${b}:${a}`;
}

function setCanvasMode(mode: "original" | "social") {
  canvasMode.value = mode;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">{{
      $t("border.aspectRatio")
    }}</span>
    <div class="flex rounded-lg overflow-hidden border border-nord-3">
      <button
        @click="setCanvasMode('original')"
        class="flex-1 px-3 py-1.5 text-xs transition-colors"
        :class="
          canvasMode !== 'social'
            ? 'bg-nord-8 text-nord-0 font-medium'
            : 'bg-nord-2 text-nord-4 hover:bg-nord-3'
        "
      >
        {{ $t("border.original") }}
      </button>
      <button
        @click="setCanvasMode('social')"
        class="flex-1 px-3 py-1.5 text-xs transition-colors"
        :class="
          canvasMode === 'social'
            ? 'bg-nord-8 text-nord-0 font-medium'
            : 'bg-nord-2 text-nord-4 hover:bg-nord-3'
        "
      >
        {{ $t("border.canvas1080") }}
      </button>
    </div>
    <div v-if="canvasMode === 'social'" class="grid grid-cols-3 gap-1">
      <button
        v-for="r in socialRatios"
        :key="r.value"
        @click="socialRatio = r.value"
        class="px-1 py-1.5 text-[11px] rounded-lg border transition-colors"
        :class="
          socialRatio === r.value
            ? 'border-nord-8 bg-nord-8/10 text-nord-8'
            : 'border-nord-3 bg-nord-2 text-nord-4 hover:border-nord-9 hover:text-nord-9'
        "
      >
        {{ r.label }}
      </button>
    </div>

    <!-- Custom ratio: two number inputs + Apply. Always shown beneath the
         presets in social mode so the user can dial in any W:H (e.g. 7:5)
         without it being a preset button. -->
    <div v-if="canvasMode === 'social'" class="flex items-center gap-2">
      <input
        v-model.number="customW"
        type="number"
        min="1"
        placeholder="W"
        class="w-full bg-nord-2 border border-nord-3 rounded-lg px-2 py-1.5 text-nord-6 text-xs focus:border-nord-8 focus:outline-none transition-colors placeholder:text-nord-6"
      />
      <span class="text-xs text-nord-4">:</span>
      <input
        v-model.number="customH"
        type="number"
        min="1"
        placeholder="H"
        class="w-full bg-nord-2 border border-nord-3 rounded-lg px-2 py-1.5 text-nord-6 text-xs focus:border-nord-8 focus:outline-none transition-colors placeholder:text-nord-6"
      />
      <button
        @click="applyCustomRatio"
        class="px-3 py-1.5 text-xs rounded-lg bg-nord-8 text-nord-0 font-medium hover:bg-nord-9 transition-colors shrink-0"
      >
        Apply
      </button>
    </div>
    <button
      v-if="canvasMode === 'social'"
      @click="invertSocialRatio"
      class="w-full py-1.5 text-[11px] rounded-lg border border-nord-3 bg-nord-2 text-nord-4 hover:border-nord-8 hover:text-nord-8 transition-colors flex items-center justify-center gap-1.5"
    >
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h5M20 20v-5h-5M5.07 9A8 8 0 019 4.07M19.93 15A8 8 0 0115 19.93"
        />
      </svg>
      {{ $t("border.invertRatio") }}
    </button>
    <p class="text-[10px] text-nord-4/70">
      {{ canvasMode === "social" ? socialDimsText : $t("border.followOriginal") }}
    </p>
  </div>
</template>
