<script setup lang="ts">
import { computed, ref, watch } from "vue";
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

const icons: Record<SectionId, string> = {
  presets: "i-lucide-layout-template",
  canvas: "i-lucide-crop",
  frame: "i-lucide-square",
  type: "i-lucide-type",
  logo: "i-lucide-stamp",
  export: "i-lucide-download",
  sync: "i-lucide-refresh-cw",
  info: "i-lucide-info",
};

/** Settings a section's reset button returns to the template's values */
const resetKeys: Partial<Record<SectionId, (keyof TemplateConfig)[]>> = {
  canvas: ["canvasMode", "socialRatio"],
  frame: ["backgroundColor", "borderRadius", "paddingTop", "paddingBottom", "paddingHorizontal"],
  type: ["fontFamily", "fontColor", "fontSize", "modelFontSize", "infoLayout", "visibleFields"],
  logo: ["showLogo", "logoPosition", "logoText", "logoImageUrl", "logoScale", "logoAspect"],
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
const phoneItems = computed(() =>
  phoneIds.value.map((id) => ({ label: title(id), value: id, icon: icons[id] })),
);
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
    <div v-if="props.mobile" class="flex shrink-0 items-center border-b border-default">
      <UTabs
        v-model="phoneTab"
        :items="phoneItems"
        :content="false"
        variant="link"
        size="xs"
        color="primary"
        class="min-w-0 flex-1"
        :ui="{
          root: 'gap-0',
          list: 'overflow-x-auto border-b-0',
          trigger: 'shrink-0 flex-col gap-0.5 px-3 py-1.5 text-[10px]',
          leadingIcon: 'size-4',
        }"
      />
      <UButton
        :icon="collapsed ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        color="neutral"
        variant="ghost"
        class="mx-1 shrink-0"
        :aria-label="collapsed ? $t('panel.edit') : $t('panel.collapse')"
        @click="collapsed = !collapsed"
      />
    </div>

    <!-- Desktop: Edit / Info -->
    <div v-else class="shrink-0 border-b border-default px-2 py-1.5">
      <SegmentedControl v-model="desktopTab" :items="desktopItems" />
    </div>

    <div v-show="!props.mobile || !collapsed" class="min-h-0 flex-1 overflow-y-auto">
      <!-- Phone: only the active section -->
      <div v-if="props.mobile" class="px-3 py-2">
        <component :is="bodies[phoneTab as SectionId]" />
      </div>

      <!-- Desktop -->
      <template v-else-if="desktopTab === 'edit'">
        <p v-if="!photoStore.selectedPhoto" class="px-3 py-8 text-center text-muted">
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
              <USwitch v-if="id === 'logo'" v-model="showLogo" :aria-label="$t('border.show')" />
              <UButton
                v-if="isChanged(id)"
                icon="i-lucide-rotate-ccw"
                color="neutral"
                variant="link"
                class="p-0.5"
                :aria-label="$t('panel.resetSection')"
                @click="resetSection(id)"
              />
            </template>
            <component :is="bodies[id]" />
          </PanelSection>
        </template>
      </template>

      <div v-else class="px-3 py-2"><ExifPanel /></div>
    </div>
  </div>
</template>
