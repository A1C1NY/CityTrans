<template>
  <BaseModal :visible="visible" large @close="$emit('close')">
    <template #header>
      <div v-if="line" class="detail-head">
        <div class="detail-head-main">
          <h2 class="detail-title">{{ line.amap_name || line.line_name }}</h2>
          <div class="detail-tags">
            <span class="badge badge-blue">线路 #{{ line.id }}</span>
            <span v-if="line.company_name" class="badge">{{ line.company_name }}</span>
            <span v-if="line.basic_price" class="badge">¥{{ line.basic_price }}</span>
            <span v-if="dataSource" class="badge" :class="dataSource === 'amap' ? 'badge-warning' : 'badge-success'">
              {{ dataSource === 'amap' ? '高德补全' : '本地数据库' }}
            </span>
          </div>
        </div>
        <FavoriteButton :active="favorite" large @toggle="toggleFavorite" />
      </div>
      <div v-else class="detail-head">
        <h2 class="detail-title">线路详情</h2>
      </div>
    </template>

    <div v-if="loading" class="loading-row">
      <span class="spinner" />
      正在加载线路详情…
    </div>

    <div v-else-if="error" class="empty-state">
      <AppIcon name="info" :size="26" />
      <strong>加载失败</strong>
      <span>{{ error }}</span>
    </div>

    <div v-else-if="line" class="detail-body">
      <div class="detail-grid">
        <div class="detail-cell">
          <span class="detail-label">起点</span>
          <span class="detail-value">{{ line.start_stop_name || '—' }}</span>
        </div>
        <div class="detail-cell">
          <span class="detail-label">终点</span>
          <span class="detail-value">{{ line.end_stop_name || '—' }}</span>
        </div>
        <div class="detail-cell">
          <span class="detail-label">首末班</span>
          <span class="detail-value">
            {{ line.first_departure_time || '—' }} / {{ line.last_departure_time || '—' }}
          </span>
        </div>
        <div class="detail-cell">
          <span class="detail-label">全程距离</span>
          <span class="detail-value">{{ line.distance_km ? `${line.distance_km} km` : '—' }}</span>
        </div>
        <div class="detail-cell">
          <span class="detail-label">高德 ID</span>
          <span class="detail-value">{{ line.amap_line_id || '—' }}</span>
        </div>
        <div class="detail-cell">
          <span class="detail-label">线路类型</span>
          <span class="detail-value">{{ line.amap_type || '—' }}</span>
        </div>
      </div>

      <div class="detail-split">
        <section class="detail-stops">
          <h3 class="section-title">
            站点序列
            <span v-if="stops.length" class="badge badge-blue">{{ stops.length }} 站</span>
          </h3>

          <div v-if="!stops.length" class="empty-state compact">
            <span>暂无站点信息</span>
          </div>

          <ol v-else class="stop-sequence scroll-area">
            <li
              v-for="item in stops"
              :key="item.stop.id"
              class="seq-item"
              :class="{ 'is-selected': selectedStopId === item.stop.id }"
              @click="selectStop(item)"
            >
              <span class="seq-index">{{ item.sequence_no }}</span>
              <div class="seq-main">
                <span class="seq-name">{{ item.stop.stop_name }}</span>
                <span class="seq-meta">{{ item.stop.longitude }}, {{ item.stop.latitude }}</span>
              </div>
              <FavoriteButton
                :active="isStopFavorite(item.stop.id)"
                @toggle="toggleStop(item.stop.id)"
              />
            </li>
          </ol>
        </section>

        <section class="detail-map">
          <MapCanvas ref="mapCanvas" @ready="onMapReady" />
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
  name: 'LineDetailModal',
  components: { BaseModal, AppIcon, FavoriteButton, MapCanvas },
  props: {
    visible: { type: Boolean, default: false },
    lineId: { type: [Number, String], default: null }
  },
  data() {
    return {
      loading: false,
      error: '',
      line: null,
      stops: [],
      geojson: null,
      dataSource: '',
      favorite: false,
      selectedStopId: null,
      map: null
    };
  },
  watch: {
    visible(value) {
      if (value && this.lineId != null) this.load();
    },
    lineId() {
      if (this.visible && this.lineId != null) this.load();
    }
  },
  methods: {
    isStopFavorite,
    async load() {
      this.loading = true;
      this.error = '';
      this.line = null;
      this.stops = [];
      this.geojson = null;
      this.selectedStopId = null;
      try {
        const data = await apiRequest(`/lines/${this.lineId}`);
        this.line = data.line || data;
        this.dataSource = data.data_source || '';
        this.favorite = isLineFavorite(this.line.id);

        const stopsData = await apiRequest(`/lines/${this.lineId}/stops`);
        this.stops = stopsData.stops || [];

        try {
          const mapData = await apiRequest(`/lines/${this.lineId}/map`);
          this.geojson = mapData.geojson || mapData;
        } catch (mapError) {
          this.geojson = null;
        }

        this.$nextTick(() => this.renderRoute());
      } catch (error) {
        this.error = error.message || '加载线路详情失败';
      } finally {
        this.loading = false;
      }
    },
    async toggleFavorite() {
      try {
        const active = await toggleLineFavorite(this.line.id);
        this.favorite = active;
        notify(active ? '已收藏线路' : '已取消收藏', active ? 'success' : 'info');
      } catch (error) {
        /* 已提示 */
      }
    },
    async toggleStop(stopId) {
      try {
        const active = await toggleStopFavorite(stopId);
        notify(active ? '已收藏站点' : '已取消收藏', active ? 'success' : 'info');
      } catch (error) {
        /* 已提示 */
      }
    },
    onMapReady(map) {
      this.map = map;
      this.renderRoute();
    },
    routeColor() {
      const color = (this.line && this.line.ui_color) || '#1f6fc4';
      return color.startsWith('#') ? color : `#${color}`;
    },
    renderRoute() {
      if (!this.map || !this.geojson) return;
      const color = this.routeColor();

      ['line', 'line-stops', 'line-path'].forEach((id) => {
        if (this.map.getLayer(id)) this.map.removeLayer(id);
        if (this.map.getSource(id)) this.map.removeSource(id);
      });

      this.map.addSource('line-path', { type: 'geojson', data: this.geojson });

      this.map.addLayer({
        id: 'line',
        type: 'line',
        source: 'line-path',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': color, 'line-width': 4 }
      });

      this.map.addLayer({
        id: 'line-stops',
        type: 'circle',
        source: 'line-path',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': color,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      const coords = [];
      (this.geojson.features || []).forEach((feature) => {
        if (feature.geometry.type === 'LineString') {
          feature.geometry.coordinates.forEach((c) => coords.push(c));
        } else if (feature.geometry.type === 'Point') {
          coords.push(feature.geometry.coordinates);
        }
      });

      this.$refs.mapCanvas.fitToCoordinates(coords, 50);
    },
    selectStop(item) {
      this.selectedStopId = item.stop.id;
      if (!this.map) return;
      const [lng, lat] = stopToLngLat(item.stop);

      if (this.map.getLayer('selected-stop')) this.map.removeLayer('selected-stop');
      if (this.map.getSource('selected-stop')) this.map.removeSource('selected-stop');

      this.map.addSource('selected-stop', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] } }
      });

      this.map.addLayer({
        id: 'selected-stop',
        type: 'circle',
        source: 'selected-stop',
        paint: {
          'circle-radius': 12,
          'circle-color': '#1f6fc4',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });

      this.map.flyTo({ center: [lng, lat], zoom: 15, essential: true });
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
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
  min-height: 380px;
}

.detail-stops {
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

.stop-sequence {
  list-style: none;
  max-height: 420px;
  border: 1px solid var(--ink-200);
  border-radius: var(--radius-sm);
  overflow-y: auto;
}

.seq-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--ink-100);
  cursor: pointer;
  transition: background-color 0.14s ease;
}

.seq-item:last-child {
  border-bottom: none;
}

.seq-item:hover {
  background: var(--blue-50);
}

.seq-item.is-selected {
  background: var(--blue-50);
  box-shadow: inset 3px 0 0 var(--blue-600);
}

.seq-index {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--ink-100);
  color: var(--ink-600);
  font-size: 11px;
  font-weight: 600;
}

.seq-item.is-selected .seq-index {
  background: var(--blue-600);
  color: var(--white);
}

.seq-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.35;
}

.seq-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seq-meta {
  font-size: 11.5px;
  color: var(--ink-500);
}

.detail-map {
  min-height: 380px;
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
    min-height: 280px;
  }
}
</style>
