<template>
  <BaseModal :visible="visible" large @close="$emit('close')">
    <template #header>
      <div v-if="stop" class="detail-head">
        <div class="detail-head-main">
          <h2 class="detail-title">{{ stop.stop_name }}</h2>
          <div class="detail-tags">
            <span class="badge badge-blue">站点 #{{ stop.id }}</span>
            <span v-if="stop.city_code" class="badge">城市 {{ stop.city_code }}</span>
            <span class="badge">{{ stop.coordinate_system }}</span>
            <span v-if="dataSource" class="badge" :class="dataSource === 'amap' ? 'badge-warning' : 'badge-success'">
              {{ dataSource === 'amap' ? '高德补全' : '本地数据库' }}
            </span>
          </div>
        </div>
        <FavoriteButton
          :active="favorite"
          large
          @toggle="toggleFavorite"
        />
      </div>
      <div v-else class="detail-head">
        <h2 class="detail-title">站点详情</h2>
      </div>
    </template>

    <div v-if="loading" class="loading-row">
      <span class="spinner" />
      正在加载站点详情…
    </div>

    <div v-else-if="error" class="empty-state">
      <AppIcon name="info" :size="26" />
      <strong>加载失败</strong>
      <span>{{ error }}</span>
    </div>

    <div v-else-if="stop" class="detail-body">
      <div class="detail-grid">
        <div class="detail-cell">
          <span class="detail-label">高德 ID</span>
          <span class="detail-value">{{ stop.amap_stop_id || '—' }}</span>
        </div>
        <div class="detail-cell">
          <span class="detail-label">坐标</span>
          <span class="detail-value">{{ stop.longitude }}, {{ stop.latitude }}</span>
        </div>
        <div class="detail-cell">
          <span class="detail-label">城市编码</span>
          <span class="detail-value">{{ stop.city_code || '—' }}</span>
        </div>
        <div class="detail-cell">
          <span class="detail-label">更新时间</span>
          <span class="detail-value">{{ updatedAt }}</span>
        </div>
      </div>

      <div class="detail-split">
        <section class="detail-lines">
          <h3 class="section-title">
            途经线路
            <span v-if="lines.length" class="badge badge-blue">{{ lines.length }}</span>
          </h3>

          <div v-if="!lines.length && !unresolved.length" class="empty-state compact">
            <span>暂无途经线路</span>
          </div>

          <ul v-else class="line-list">
            <li
              v-for="line in lines"
              :key="line.id"
              class="line-row"
              @click="$emit('open-line', line.id)"
            >
              <span class="line-color" :style="{ background: lineColor(line) }" />
              <div class="line-row-main">
                <span class="line-name">{{ line.line_name || line.amap_name }}</span>
                <span class="line-meta">
                  {{ line.start_stop_name || '—' }} → {{ line.end_stop_name || '—' }}
                </span>
              </div>
              <FavoriteButton
                :active="isLineFavorite(line.id)"
                @toggle="toggleLine(line.id)"
              />
            </li>

            <li
              v-for="summary in unresolved"
              :key="summary.amap_line_id"
              class="line-row is-unresolved"
              @click="resolveSummary(summary.amap_line_id)"
            >
              <span class="line-color is-muted" />
              <div class="line-row-main">
                <span class="line-name">{{ summary.line_name || summary.amap_name }}</span>
                <span class="line-meta">
                  {{ summary.start_stop_name || '—' }} → {{ summary.end_stop_name || '—' }}
                </span>
              </div>
              <span class="badge badge-warning">点击补全</span>
            </li>
          </ul>
        </section>

        <section class="detail-map">
          <MapCanvas ref="mapCanvas" :center="mapCenter" :zoom="15" @ready="onMapReady" />
        </section>
      </div>
    </div>
  </BaseModal>
</template>

<script>
import BaseModal from './BaseModal.vue';
import AppIcon from './AppIcon.vue';
import FavoriteButton from './FavoriteButton.vue';
import MapCanvas from './MapCanvas.vue';
import { apiRequest } from '../api/client';
import { stopToLngLat } from '../geo/coords';
import {
  isStopFavorite,
  isLineFavorite,
  toggleStopFavorite,
  toggleLineFavorite
} from '../stores/favorites';
import { notify } from '../stores/toast';

export default {
  name: 'StopDetailModal',
  components: { BaseModal, AppIcon, FavoriteButton, MapCanvas },
  props: {
    visible: { type: Boolean, default: false },
    stopId: { type: [Number, String], default: null }
  },
  data() {
    return {
      loading: false,
      error: '',
      stop: null,
      lines: [],
      unresolved: [],
      dataSource: '',
      map: null,
      favorite: false
    };
  },
  computed: {
    mapCenter() {
      if (!this.stop) return [121.475108, 31.232687];
      return stopToLngLat(this.stop);
    },
    updatedAt() {
      if (!this.stop || !this.stop.updated_at) return '—';
      return new Date(this.stop.updated_at).toLocaleString('zh-CN');
    }
  },
  watch: {
    visible(value) {
      if (value && this.stopId != null) this.load();
    },
    stopId() {
      if (this.visible && this.stopId != null) this.load();
    }
  },
  methods: {
    isLineFavorite,
    lineColor(line) {
      const color = line.ui_color || '#1f6fc4';
      return color.startsWith('#') ? color : `#${color}`;
    },
    async load() {
      this.loading = true;
      this.error = '';
      this.stop = null;
      this.lines = [];
      this.unresolved = [];
      try {
        const params = new URLSearchParams({ entry_point: 'search' });
        const data = await apiRequest(`/stops/${this.stopId}?${params}`);
        this.stop = data.stop || data;
        this.dataSource = data.data_source || '';
        this.favorite = isStopFavorite(this.stop.id);

        const linesData = await apiRequest(`/stops/${this.stopId}/lines`);
        this.lines = linesData.lines || [];
        this.unresolved = linesData.unresolved_summaries || [];
      } catch (error) {
        this.error = error.message || '加载站点详情失败';
      } finally {
        this.loading = false;
      }
    },
    async toggleFavorite() {
      try {
        const active = await toggleStopFavorite(this.stop.id);
        this.favorite = active;
        notify(active ? '已收藏站点' : '已取消收藏', active ? 'success' : 'info');
      } catch (error) {
        /* 已提示 */
      }
    },
    async toggleLine(lineId) {
      try {
        const active = await toggleLineFavorite(lineId);
        notify(active ? '已收藏线路' : '已取消收藏', active ? 'success' : 'info');
      } catch (error) {
        /* 已提示 */
      }
    },
    async resolveSummary(amapLineId) {
      try {
        notify('正在从高德获取线路详情…', 'info');
        const data = await apiRequest(`/lines/by-amap/${amapLineId}`);
        const line = data.line || data;
        notify('线路详情已加载', 'success');
        this.$emit('open-line', line.id);
      } catch (error) {
        /* 已提示 */
      }
    },
    onMapReady(map) {
      this.map = map;
      this.renderMarker();
    },
    renderMarker() {
      if (!this.map || !this.stop) return;
      const [lng, lat] = stopToLngLat(this.stop);

      if (this.map.getLayer('stop-marker')) this.map.removeLayer('stop-marker');
      if (this.map.getSource('stop-marker')) this.map.removeSource('stop-marker');

      this.map.addSource('stop-marker', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] } }
      });

      this.map.addLayer({
        id: 'stop-marker',
        type: 'circle',
        source: 'stop-marker',
        paint: {
          'circle-radius': 10,
          'circle-color': '#1f6fc4',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });

      this.map.flyTo({ center: [lng, lat], zoom: 16, essential: true });
    }
  }
};
</script>

<style scoped>
.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.detail-head-main {
  min-width: 0;
}

.detail-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}

.detail-body {
  padding: 18px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1px;
  margin-bottom: 18px;
  border: 1px solid var(--ink-200);
  border-radius: var(--radius-sm);
  background: var(--ink-200);
  overflow: hidden;
}

.detail-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px 14px;
  background: var(--white);
}

.detail-label {
  font-size: 11.5px;
  color: var(--ink-500);
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-800);
  word-break: break-all;
}

.detail-split {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 1.15fr;
  gap: 16px;
  min-height: 340px;
}

.detail-lines {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-900);
}

.line-list {
  list-style: none;
  border: 1px solid var(--ink-200);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.line-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ink-100);
  cursor: pointer;
  transition: background-color 0.14s ease;
}

.line-row:last-child {
  border-bottom: none;
}

.line-row:hover {
  background: var(--blue-50);
}

.line-row.is-unresolved {
  background: #fffcf5;
}

.line-row.is-unresolved:hover {
  background: #fffaeb;
}

.line-color {
  width: 3px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 999px;
}

.line-color.is-muted {
  background: var(--ink-300);
}

.line-row-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.35;
}

.line-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-meta {
  font-size: 11.5px;
  color: var(--ink-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-map {
  min-height: 340px;
  border: 1px solid var(--ink-200);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.empty-state.compact {
  padding: 28px 16px;
  border: 1px dashed var(--ink-300);
  border-radius: var(--radius-sm);
}

@media (max-width: 860px) {
  .detail-split {
    grid-template-columns: 1fr;
  }

  .detail-map {
    min-height: 260px;
  }
}
</style>
