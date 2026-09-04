<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { usePreferences } from "~/composables/usePreferences";

const { themeId, localeCode, setTheme, THEME_LIST } = usePreferences();

const open = ref(false);
const root = ref<HTMLElement | null>(null);

const localeOptions = [
  { code: "en", label: "English", short: "EN" },
  { code: "zh-CN", label: "简体中文", short: "中文" },
] as const;

const currentShort = computed(
  () => localeOptions.find((o) => o.code === localeCode.value)?.short ?? "EN",
);

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false;
}

onMounted(() => document.addEventListener("pointerdown", onDocClick));
onUnmounted(() => document.removeEventListener("pointerdown", onDocClick));
</script>

<template>
  <div ref="root" class="relative">
    <!-- Trigger: palette icon + current language code -->
    <button
      type="button"
      class="px-2.5 py-1.5 bg-nord-2 text-nord-4 rounded shadow hover:bg-nord-3 hover:text-nord-6 transition-colors flex items-center gap-1.5 text-xs font-medium"
      :aria-expanded="open"
      title="Theme & Language"
      @click="open = !open"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
      <span class="tabular-nums">{{ currentShort }}</span>
    </button>

    <!-- Popover -->
    <Transition name="prefs-pop">
      <div
        v-if="open"
        class="absolute right-0 top-full mt-2 w-64 z-50 bg-nord-1 border border-nord-3 rounded-xl shadow-2xl p-4 flex flex-col gap-4 text-sm text-nord-4"
      >
        <!-- Theme -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-medium text-nord-6">{{ $t("appearance.theme") }}</span>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="t in THEME_LIST"
              :key="t.id"
              type="button"
              class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors cursor-pointer"
              :class="
                themeId === t.id
                  ? 'border-nord-8 bg-nord-8/10'
                  : 'border-nord-3 bg-nord-2 text-nord-4 hover:border-nord-4'
              "
              :title="$t(t.labelKey)"
              @click="setTheme(t.id)"
            >
              <span class="flex shrink-0">
                <span
                  v-for="(hex, i) in t.swatches"
                  :key="hex"
                  class="w-3 h-3 border border-black/10 -ml-1 first:ml-0 rounded-full"
                  :style="{ backgroundColor: hex }"
                />
              </span>
              <span class="text-xs text-nord-6 truncate">{{ $t(t.labelKey) }}</span>
            </button>
          </div>
          <p class="text-[10px] text-nord-4/60">{{ $t("appearance.themeHint") }}</p>
        </div>

        <!-- Language -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-medium text-nord-6">{{ $t("appearance.language") }}</span>
          <div class="flex rounded-lg overflow-hidden border border-nord-3 self-start">
            <button
              v-for="opt in localeOptions"
              :key="opt.code"
              type="button"
              class="px-3 py-1 text-xs transition-colors cursor-pointer"
              :class="
                localeCode === opt.code
                  ? 'bg-nord-8 text-nord-0 font-medium'
                  : 'bg-nord-2 text-nord-4 hover:bg-nord-3'
              "
              @click="localeCode = opt.code"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.prefs-pop-enter-active,
.prefs-pop-leave-active {
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
}
.prefs-pop-enter-from,
.prefs-pop-leave-to {
  transform: translateY(-4px);
  opacity: 0;
}
</style>
