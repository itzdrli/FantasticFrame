<script setup lang="ts">
import { computed } from "vue";
import type { RenderNode } from "~/types";

/**
 * Draws a takumi node tree (from buildRenderTree) as DOM, so the live preview
 * is laid out by the exact tree the exporter rasterizes. `frame` marks the
 * photo's clipping frame; `frameAttrs` (crop-drag handlers, cursor class) are
 * bound onto that one element.
 */
const props = defineProps<{
  node: RenderNode;
  frame?: RenderNode;
  frameAttrs?: Record<string, unknown>;
}>();

// Takumi takes bare numbers as pixels; CSS needs the unit except on these
const UNITLESS = new Set([
  "flex",
  "flexGrow",
  "flexShrink",
  "opacity",
  "fontWeight",
  "lineHeight",
  "zIndex",
  "order",
]);

const css = computed(() => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(props.node.style ?? {})) {
    if (value === undefined || value === null) continue;
    out[key] = typeof value === "number" && !UNITLESS.has(key) ? `${value}px` : String(value);
  }
  return out;
});

const imageSize = computed(() => ({
  width: `${props.node.width}px`,
  height: `${props.node.height}px`,
  maxWidth: "none",
  display: "block",
}));
</script>

<template>
  <img
    v-if="node.type === 'image'"
    :src="node.src"
    :style="[imageSize, css]"
    draggable="false"
    alt=""
  />
  <div v-else-if="node.type === 'text'" :style="css">{{ node.text }}</div>
  <div v-else :style="css" v-bind="node === frame ? frameAttrs : undefined">
    <RenderNodeView
      v-for="(child, i) in node.children ?? []"
      :key="i"
      :node="child"
      :frame="frame"
      :frame-attrs="frameAttrs"
    />
  </div>
</template>
