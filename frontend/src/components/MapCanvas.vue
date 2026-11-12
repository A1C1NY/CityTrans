<template>
  <div ref="container" class="map-canvas" />
</template>

<script>
import { createMap, removeLayerAndSource, fitToCoordinates } from '../map/base';

export default {
  name: 'MapCanvas',
  props: {
    center: { type: Array, default: () => [121.475108, 31.232687] },
    zoom: { type: Number, default: 12 }
  },
  data() {
    return { map: null, readyEmitted: false };
  },
  mounted() {
    this.map = createMap(this.$refs.container, this.center, this.zoom);
    this.$emit('map-created', this.map);

    this.map.on('load', () => this.emitReady());
    // 底图瓦片不可用时 load 可能不触发，用 styledata 与定时器兜底。
    this.map.on('styledata', () => this.emitReady());

    this.readyTimer = window.setTimeout(() => this.emitReady(), 1200);

    this.resizeObserver = new ResizeObserver(() => {
      if (this.map) this.map.resize();
    });
    this.resizeObserver.observe(this.$refs.container);
  },
  beforeDestroy() {
    window.clearTimeout(this.readyTimer);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  },
  methods: {
    emitReady() {
      if (this.readyEmitted || !this.map) return;
      this.readyEmitted = true;
      this.map.resize();
      this.$emit('ready', this.map);
    },
    removeLayerAndSource(id) {
      removeLayerAndSource(this.map, id);
    },
    fitToCoordinates(coords, padding) {
      fitToCoordinates(this.map, coords, padding);
    }
  }
};
</script>

<style scoped>
.map-canvas {
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: var(--ink-100);
}
</style>
