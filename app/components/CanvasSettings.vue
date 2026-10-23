<script setup lang="ts">
import { computed, ref } from "vue";
import { socialCanvasDims } from "~~/shared/render";

const { overrides, resolvedConfig, update } = useSelectedTemplate();
const { t } = useI18n();

const canvasMode = computed({
  get: () => overrides.value.canvasMode ?? resolvedConfig.value?.canvasMode ?? "original",
  set: (v) => update("canvasMode", v),
});
const socialRatio = computed({
  get: () => overrides.value.socialRatio ?? resolvedConfig.value?.socialRatio ?? "4:5",
  set: (v) => update("socialRatio", v),
});

const modeItems = computed(() => [
  { label: t("border.original"), value: "original" },
  { label: t("border.canvas1080"), value: "social" },
]);
const modeModel = computed({
  get: () => (canvasMode.value === "social" ? "social" : "original"),
  set: (v: string) => (canvasMode.value = v as "original" | "social"),
});

// Landscape forms only — "Invert" gives the portrait counterpart (3:4 → 4:3).
const socialRatios = ["1:1", "4:3", "3:4", "16:9", "21:9", "1.91:1"];

// Separate W and H inputs avoid mid-edit states like "16:" that would be invalid.
const customW = ref<number | undefined>();
const customH = ref<number | undefined>();

const applyCustomRatio = () => {
  // Whole numbers 1–99: the export API only accepts ratios like "4:5"
  const w = Math.round(customW.value ?? 0);
  const h = Math.round(customH.value ?? 0);
  if (w > 0 && h > 0) socialRatio.value = `${Math.min(99, w)}:${Math.min(99, h)}`;
};

const socialDimsText = computed(() => {
  const { h } = socialCanvasDims(socialRatio.value);
  return `${socialRatio.value} → 1080×${h}`;
});

function invertSocialRatio() {
  const [a, b] = socialRatio.value.split(":");
  socialRatio.value = `${b}:${a}`;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <SegmentedControl v-model="modeModel" :items="modeItems" />

    <template v-if="canvasMode === 'social'">
      <div class="grid grid-cols-3 gap-1">
        <UButton
          v-for="r in socialRatios"
          :key="r"
          :label="r"
          size="xs"
          :variant="socialRatio === r ? 'soft' : 'outline'"
          :color="socialRatio === r ? 'primary' : 'neutral'"
          block
          @click="socialRatio = r"
        />
      </div>

      <div class="flex items-center gap-1.5">
        <UInputNumber
          v-model="customW"
          :min="1"
          :max="99"
          :increment="false"
          :decrement="false"
          placeholder="W"
          variant="subtle"
          class="min-w-0 flex-1"
          @keydown.enter="applyCustomRatio"
        />
        <span class="text-dimmed">:</span>
        <UInputNumber
          v-model="customH"
          :min="1"
          :max="99"
          :increment="false"
          :decrement="false"
          placeholder="H"
          variant="subtle"
          class="min-w-0 flex-1"
          @keydown.enter="applyCustomRatio"
        />
        <UButton
          :label="$t('border.apply')"
          color="neutral"
          variant="subtle"
          @click="applyCustomRatio"
        />
      </div>

      <UButton
        :label="$t('border.invertRatio')"
        icon="i-lucide-rotate-cw"
        color="neutral"
        variant="outline"
        block
        @click="invertSocialRatio"
      />
    </template>

    <p class="font-mono text-[10px] text-dimmed">
      {{ canvasMode === "social" ? socialDimsText : $t("border.followOriginal") }}
    </p>
  </div>
</template>
