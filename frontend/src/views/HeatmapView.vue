<template>
  <div class="heatmap-view">
    <div class="page-head">
      <div>
        <h1 class="page-title">密度热力图</h1>
        <p class="page-subtitle">按当前地图范围聚合站点或线路密度，缩放后自动刷新</p>
      </div>
    </div>

    <section class="control-bar card">
      <SegmentedControl v-model="heatmapType" :options="typeOptions" @input="onTypeChange" />

      <label class="grid-field">
        <span class="field-label">网格大小（米）</span>
        <input
          v-model.number="gridSize"
          class="input grid-input"
          type="number"
          min="50"
          max="2000"
          step="50"
        />
      </label>

      <div class="control-actions">
        <span v-if="autoRefresh" class="live-badge">
          <span class="live-dot" />
          自动刷新
        </span>
        <button class="btn btn-primary" :disabled="loading" @click="startAutoRefresh">
          <span v-if="loading" class="spinner spinner-light" />
          <AppIcon v-else name="flame" :size="15" />
          {{ loading ? '加载中' : '加载热力图' }}
        </button>
      </div>
    </section>

    <section class="map-card card">
      <MapCanvas ref="mapCanvas" @ready="onMapReady" />
      <div v-if="summary" class="map-overlay">
        <span class="overlay-item">
          <strong>{{ summary.metric }}</strong>
        </span>
        <span class="overlay-divider" />
        <span class="overlay-item">网格 {{ summary.gridSize }} m</span>
        <span class="overlay-divider" />
        <span class="overlay-item">{{ summary.count }} 个网格</span>
      </div>
    </section>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue';
import MapCanvas from '../components/MapCanvas.vue';
import SegmentedControl from '../components/SegmentedControl.vue';
import { apiRequest } from '../api/client';
import { resolveHeatmapRequest, applyHeatmap } from '../map/heatmap';
import { notify } from '../stores/toast';

export default {
  name: 'HeatmapView',
  components: { AppIcon, MapCanvas, SegmentedControl },
  data() {
    return {
      heatmapType: 'stops',
      gridSize: 100,
      loading: false,
      autoRefresh: false,
      map: null,
      summary: null,
      refreshTimer: null
    };
  },
  computed: {
    typeOptions() {
      return [
        { value: 'stops', label: '站点密度', icon: 'pin' },
        { value: 'lines', label: '线路密度', icon: 'route' }
      ];
    }
  },
  beforeDestroy() {
    window.clearTimeout(this.refreshTimer);
  },
  methods: {
    onMapReady(map) {
      this.map = map;
      map.on('moveend', () => {
        if (!this.autoRefresh) return;
        window.clearTimeout(this.refreshTimer);
        this.refreshTimer = window.setTimeout(() => this.load(false), 250);
      });
    },
    // 与原版一致：点击「加载热力图」后才开启自动刷新。
    async startAutoRefresh() {
      this.autoRefresh = true;
      await this.load(true);
    },
    async onTypeChange() {
      if (this.autoRefresh && this.map) {
        await this.load(false);
      }
    },
    async load(showSuccess) {
      if (!this.map) {
        notify('地图未初始化', 'error');
        return;
      }

      const requestedGridSize = Number(this.gridSize) || 100;
      const { bbox, zoom, gridSize } = resolveHeatmapRequest(this.map, requestedGridSize);

      this.loading = true;
      try {
        const endpoint = this.heatmapType === 'stops'
          ? `/analytics/heatmaps/stops?bbox=${bbox}&grid_size_m=${gridSize}`
          : `/analytics/heatmaps/lines?bbox=${bbox}&grid_size_m=${gridSize}`;

        const response = await apiRequest(endpoint);
        const geojson = response.geojson || response;
        const count = applyHeatmap(this.map, this.heatmapType, zoom, geojson);

        this.summary = {
          metric: this.heatmapType === 'stops' ? '站点密度' : '线路密度',
          gridSize,
          count
        };

        if (!count) {
          if (showSuccess) {
            notify('当前地图范围内没有可显示的数据，请移动或缩放地图后重试', 'info');
          }
          return;
        }

        if (showSuccess) {
          notify(`热力图加载成功，共 ${count} 个网格`, 'success');
        }
      } catch (error) {
        if (showSuccess) notify('加载热力图失败', 'error');
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.heatmap-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-bar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 18px;
}

.grid-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.grid-input {
  width: 130px;
}

.control-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ink-500);
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(18, 183, 106, 0.16);
}

.map-card {
  position: relative;
  height: calc(100vh - 250px);
  min-height: 500px;
  overflow: hidden;
}

.map-card > .map-canvas {
  position: absolute;
  inset: 0;
}

.map-overlay {
  position: absolute;
  left: 14px;
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 13px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ink-200);
  box-shadow: var(--shadow-sm);
  font-size: 12px;
  color: var(--ink-600);
  backdrop-filter: blur(4px);
}

.overlay-item strong {
  font-weight: 600;
  color: var(--ink-900);
}

.overlay-divider {
  width: 1px;
  height: 12px;
  background: var(--ink-200);
}

.spinner-light {
  border-color: rgba(255, 255, 255, 0.4);
  border-top-color: var(--white);
}
</style>
