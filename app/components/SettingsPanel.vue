<script setup lang="ts">
import { computed, ref, watch, type Component } from "vue";
import { NButton, NIcon, NSwitch, NTab, NTabs } from "naive-ui";
import {
  ChevronDown,
  ChevronUp,
  Crop,
  Download,
  Info,
  LayoutTemplate,
  RefreshCw,
  RotateCcw,
  Square,
  Stamp,
  Type,
} from "@lucide/vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import type { TemplateConfig } from "~/types";

const props = defineProps<{ mobile: boolean }>();
/** Phones only: the sheet shrinks to its tab bar so the photo gets the whole screen */
const collapsed = defineModel<boolean>("collapsed", { default: true });

const { t } = useI18n();
const photoStore = usePhotoStore();
const { overrides, resolvedConfig, defaults, update, updateMany } = useSelectedTemplate();

type SectionId = "presets" | "canvas" | "frame" | "type" | "logo" | "export" | "sync" | "info";

const bodies = {
  presets: resolveComponent("TemplateSelector"),
  canvas: resolveComponent("CanvasSettings"),
  frame: resolveComponent("BorderSettings"),
  type: resolveComponent("TypeSettings"),
  logo: resolveComponent("LogoSettings"),
  export: resolveComponent("ExportSettings"),
  sync: resolveComponent("StyleSyncBar"),
  info: resolveComponent("ExifPanel"),
};

const icons: Record<SectionId, Component> = {
  presets: LayoutTemplate,
  canvas: Crop,
  frame: Square,
  type: Type,
  logo: Stamp,
  export: Download,
  sync: RefreshCw,
  info: Info,
};

/** Settings a section's reset button returns to the template's values */
const resetKeys: Partial<Record<SectionId, (keyof TemplateConfig)[]>> = {
  canvas: ["canvasMode", "socialRatio"],
  frame: [
    "backgroundColor",
    "backgroundMode",
    "backgroundBlur",
    "backgroundDim",
    "borderRadius",
    "photoShadow",
    "paddingTop",
    "paddingBottom",
    "paddingHorizontal",
    "edgeText",
  ],
  type: [
    "captionStyle",
    "fontFamily",
    "fontColor",
    "secondaryColor",
    "fontSize",
    "modelFontSize",
    "letterSpacing",
    "infoLayout",
    "visibleFields",
    "dateStamp",
    "dateStampColor",
  ],
  logo: [
    "showLogo",
    "logoAuto",
    "logoPosition",
    "logoText",
    "logoImageUrl",
    "logoScale",
    "logoAspect",
  ],
};

const editSections = computed<SectionId[]>(() => [
  ...(photoStore.count > 1 ? (["sync"] as const) : []),
  "presets",
  "canvas",
  "frame",
  "type",
  "logo",
  "export",
]);

const title = (id: SectionId) => t(`panel.${id}`);

const open = ref<Record<string, boolean>>({ sync: false });
const isOpen = (id: SectionId) => open.value[id] ?? true;

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function isChanged(id: SectionId) {
  const keys = resetKeys[id];
  if (!keys || !defaults.value || !resolvedConfig.value) return false;
  return keys.some(
    (k) => !same(overrides.value[k] ?? resolvedConfig.value![k], defaults.value![k]),
  );
}

function resetSection(id: SectionId) {
  const keys = resetKeys[id];
  if (!keys || !defaults.value) return;
  const patch: Record<string, unknown> = {};
  for (const k of keys) {
    // visibleFields must never be written as undefined (see mergeTemplateOverrides)
    if (defaults.value[k] !== undefined) patch[k] = defaults.value[k];
  }
  updateMany(patch as Partial<TemplateConfig>);
}

const showLogo = computed({
  get: () => overrides.value.showLogo ?? resolvedConfig.value?.showLogo ?? true,
  set: (v) => update("showLogo", v),
});

// ── Desktop: Edit / Info tabs ──────────────────────────────────────────────
const desktopTab = ref("edit");
const desktopItems = computed(() => [
  { label: t("panel.edit"), value: "edit" },
  { label: t("panel.info"), value: "info" },
]);

// ── Phone: one icon tab per section (Info included) ────────────────────────
const phoneIds = computed<SectionId[]>(() => [...editSections.value, "info"]);
const phoneTab = ref<string>("presets");
watch(phoneTab, () => (collapsed.value = false));
watch(
  () => photoStore.count,
  () => {
    if (!phoneIds.value.includes(phoneTab.value as SectionId)) phoneTab.value = "presets";
  },
);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <!-- Phone: icon tab bar + collapse toggle -->
    <div v-if="props.mobile" class="flex shrink-0 items-center border-b border-nord-3">
      <!-- Keyed by the tab list: Naive only re-measures the active-tab bar on
           selection, so the Sync tab appearing would leave it misplaced -->
      <NTabs
        :key="phoneIds.join()"
        v-model:value="phoneTab"
        type="line"
        size="small"
        class="min-w-0 flex-1"
      >
        <NTab v-for="id in phoneIds" :key="id" :name="id">
          <span class="flex flex-col items-center gap-0.5 text-[12px]">
            <NIcon :size="16"><component :is="icons[id]" /></NIcon>
            {{ title(id) }}
          </span>
        </NTab>
      </NTabs>
      <span class="mx-1 flex shrink-0">
        <NButton
          quaternary
          size="tiny"
          :aria-label="collapsed ? $t('panel.edit') : $t('panel.collapse')"
          @click="collapsed = !collapsed"
        >
          <template #icon>
            <NIcon><component :is="collapsed ? ChevronUp : ChevronDown" /></NIcon>
          </template>
        </NButton>
      </span>
    </div>

    <!-- Desktop: Edit / Info -->
    <div v-else class="shrink-0 border-b border-nord-3 px-3 py-2">
      <SegmentedControl v-model="desktopTab" :items="desktopItems" />
    </div>

    <div v-show="!props.mobile || !collapsed" class="min-h-0 flex-1 overflow-y-auto">
      <!-- Phone: only the active section -->
      <div v-if="props.mobile" class="px-4 py-3">
        <component :is="bodies[phoneTab as SectionId]" />
      </div>

      <!-- Desktop -->
      <template v-else-if="desktopTab === 'edit'">
        <p v-if="!photoStore.selectedPhoto" class="px-3 py-8 text-center text-nord-4">
          {{ $t("border.selectPhotoFirst") }}
        </p>
        <template v-else>
          <PanelSection
            v-for="id in editSections"
            :key="id"
            :open="isOpen(id)"
            :title="title(id)"
            @update:open="open[id] = $event"
          >
            <template #actions>
              <NSwitch
                v-if="id === 'logo'"
                v-model:value="showLogo"
                size="small"
                :aria-label="$t('border.show')"
              />
              <NButton
                v-if="isChanged(id)"
                text
                size="tiny"
                :aria-label="$t('panel.resetSection')"
                @click="resetSection(id)"
              >
                <template #icon>
                  <NIcon><RotateCcw /></NIcon>
                </template>
              </NButton>
            </template>
            <component :is="bodies[id]" />
          </PanelSection>
        </template>
      </template>

      <div v-else class="px-4 py-3"><ExifPanel /></div>
    </div>
  </div>
</template>
