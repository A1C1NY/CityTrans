<template>
  <div class="search-view">
    <div class="page-head">
      <div>
        <h1 class="page-title">站点搜索</h1>
        <p class="page-subtitle">按站点或线路名称检索，数据优先来自本地库，缺失时自动从高德补全</p>
      </div>
    </div>

    <section class="search-card card">
      <div class="search-card-top">
        <SegmentedControl v-model="searchType" :options="typeOptions" />
        <span class="search-hint">
          <AppIcon name="info" :size="14" />
          {{ searchType === 'stop' ? '支持站点名称模糊匹配' : '支持线路名称，如 123路' }}
        </span>
      </div>

      <div class="search-row">
        <div class="search-input-wrap">
          <AppIcon name="search" :size="17" class="search-input-icon" />
          <input
            v-model.trim="query"
            class="input search-input"
            type="text"
            :placeholder="searchType === 'stop' ? '输入站点名称' : '输入线路名称（如：123路）'"
            @keyup.enter="runSearch"
          />
        </div>

        <label class="city-field">
          <span class="city-label">城市编码</span>
          <input v-model.trim="cityCode" class="input city-input" type="text" placeholder="021" />
        </label>

        <ToggleSwitch v-model="refreshFromAmap" class="refresh-toggle">
          从高德刷新
        </ToggleSwitch>

        <button class="btn btn-primary search-submit" :disabled="loading" @click="runSearch">
          <span v-if="loading" class="spinner spinner-light" />
          <AppIcon v-else name="search" :size="16" />
          {{ loading ? '搜索中' : '搜索' }}
        </button>
      </div>
    </section>

    <div class="split-view">
      <section class="result-panel card">
        <header class="card-header">
          <span class="card-title">搜索结果</span>
          <span v-if="results.length" class="badge badge-blue">{{ results.length }} 条</span>
        </header>

        <div class="result-body scroll-area">
          <div v-if="loading" class="loading-row">
            <span class="spinner" />
            正在检索…
          </div>

          <div v-else-if="!searched" class="empty-state">
            <AppIcon name="search" :size="26" />
            <strong>开始一次搜索</strong>
            <span>输入关键词后按回车或点击搜索</span>
          </div>

          <div v-else-if="!results.length" class="empty-state">
            <AppIcon name="info" :size="26" />
            <strong>未找到结果</strong>
            <span>可尝试更换关键词，或开启「从高德刷新」</span>
          </div>

          <ul v-else class="result-list">
            <li
              v-for="item in results"
              :key="item.id"
              class="result-item"
              @click="openDetail(item)"
            >
              <div class="result-main">
                <div class="result-title-row">
                  <span class="result-title">{{ displayName(item) }}</span>
                  <span v-if="searchType === 'stop'" class="badge">{{ item.city_code || '—' }}</span>
                </div>

                <p v-if="searchType === 'stop'" class="result-meta">
                  <AppIcon name="pin" :size="13" />
                  {{ item.longitude }}, {{ item.latitude }}
                </p>
                <p v-else class="result-meta">
                  <AppIcon name="route" :size="13" />
                  {{ item.start_stop_name || '—' }} → {{ item.end_stop_name || '—' }}
                </p>

                <p v-if="searchType === 'line' && item.first_departure_time" class="result-meta">
                  <AppIcon name="clock" :size="13" />
                  首班 {{ item.first_departure_time }} · 末班 {{ item.last_departure_time || '—' }}
                </p>
              </div>

              <FavoriteButton
                :active="isFavorite(item.id)"
                @toggle="toggleFavorite(item.id)"
              />
            </li>
          </ul>
        </div>

        <footer v-if="dataSource" class="result-footer">
          <span class="badge" :class="dataSource === 'amap' ? 'badge-warning' : 'badge-success'">
            数据来源：{{ dataSource === 'amap' ? '高德补全' : '本地数据库' }}
          </span>
        </footer>
      </section>

      <section class="map-panel card">
        <MapCanvas ref="mapCanvas" @ready="onMapReady" />
      </section>
    </div>

    <StopDetailModal
      :visible="stopModal.visible"
      :stop-id="stopModal.id"
      @close="stopModal.visible = false"
      @open-line="openLine"
    />
    <LineDetailModal
      :visible="lineModal.visible"
      :line-id="lineModal.id"
      @close="lineModal.visible = false"
      @open-stop="openStop"
    />
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue';
import MapCanvas from '../components/MapCanvas.vue';
import SegmentedControl from '../components/SegmentedControl.vue';
import ToggleSwitch from '../components/ToggleSwitch.vue';
import FavoriteButton from '../components/FavoriteButton.vue';
import StopDetailModal from '../components/StopDetailModal.vue';
import LineDetailModal from '../components/LineDetailModal.vue';
import { apiRequest } from '../api/client';
import { stopToLngLat } from '../geo/coords';
import {
  favoritesState,
  isStopFavorite,
  isLineFavorite,
  toggleStopFavorite,
  toggleLineFavorite,
  loadFavorites
} from '../stores/favorites';
import { notify } from '../stores/toast';

export default {
  name: 'SearchView',
  components: {
    AppIcon,
    MapCanvas,
    SegmentedControl,
    ToggleSwitch,
    FavoriteButton,
    StopDetailModal,
    LineDetailModal
  },
  data() {
    return {
      searchType: 'stop',
      query: '',
      cityCode: '021',
      refreshFromAmap: false,
      loading: false,
      searched: false,
      results: [],
      dataSource: '',
      map: null,
      stopModal: { visible: false, id: null },
      lineModal: { visible: false, id: null }
    };
  },
  computed: {
    typeOptions() {
      return [
        { value: 'stop', label: '搜索车站', icon: 'pin' },
        { value: 'line', label: '搜索线路', icon: 'route' }
      ];
    }
  },
  watch: {
    searchType() {
      this.results = [];
      this.searched = false;
      this.dataSource = '';
      this.clearMap();
    }
  },
  created() {
    if (!favoritesState.loaded) loadFavorites();
  },
  methods: {
    displayName(item) {
      return this.searchType === 'stop'
        ? item.stop_name
        : item.line_name || item.amap_name;
    },
    isFavorite(id) {
      return this.searchType === 'stop' ? isStopFavorite(id) : isLineFavorite(id);
    },
    async toggleFavorite(id) {
      try {
        if (this.searchType === 'stop') {
          const active = await toggleStopFavorite(id);
          notify(active ? '已收藏站点' : '已取消收藏', active ? 'success' : 'info');
        } else {
          const active = await toggleLineFavorite(id);
          notify(active ? '已收藏线路' : '已取消收藏', active ? 'success' : 'info');
        }
      } catch (error) {
        /* 错误已由请求层提示 */
      }
    },
    async runSearch() {
      if (!this.query) {
        notify('请输入搜索内容', 'error');
        return;
      }
      this.loading = true;
      this.searched = true;
      try {
        const params = new URLSearchParams({ q: this.query, limit: 20 });
        if (this.cityCode) params.append('city_code', this.cityCode);
        if (this.refreshFromAmap) params.append('refresh', 'true');

        const endpoint = this.searchType === 'stop' ? '/stops/search' : '/lines/search';
        const data = await apiRequest(`${endpoint}?${params}`);
        this.results = data.items || [];
        this.dataSource = data.data_source || '';
        this.renderMap();
      } catch (error) {
        this.results = [];
        this.dataSource = '';
        this.clearMap();
      } finally {
        this.loading = false;
      }
    },
    onMapReady(map) {
      this.map = map;
      this.renderMap();
    },
    clearMap() {
      if (!this.map) return;
      if (this.map.getSource('search-stops')) {
        this.map.getSource('search-stops').setData({ type: 'FeatureCollection', features: [] });
      }
    },
    renderMap() {
      if (!this.map || this.searchType !== 'stop' || !this.results.length) {
        this.clearMap();
        return;
      }

      const features = this.results.map((stop) => {
        const [lng, lat] = stopToLngLat(stop);
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { id: stop.id, name: stop.stop_name }
        };
      });

      const collection = { type: 'FeatureCollection', features };

      if (this.map.getSource('search-stops')) {
        this.map.getSource('search-stops').setData(collection);
      } else {
        this.map.addSource('search-stops', { type: 'geojson', data: collection });
        this.map.addLayer({
          id: 'search-stops',
          type: 'circle',
          source: 'search-stops',
          paint: {
            'circle-radius': 8,
            'circle-color': '#1f6fc4',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
        this.map.on('click', 'search-stops', (event) => {
          const stopId = event.features[0].properties.id;
          this.openStop(stopId);
        });
        this.map.on('mouseenter', 'search-stops', () => {
          this.map.getCanvas().style.cursor = 'pointer';
        });
        this.map.on('mouseleave', 'search-stops', () => {
          this.map.getCanvas().style.cursor = '';
        });
      }

      this.$refs.mapCanvas.fitToCoordinates(features.map((f) => f.geometry.coordinates), 60);
    },
    openDetail(item) {
      if (this.searchType === 'stop') this.openStop(item.id);
      else this.openLine(item.id);
    },
    openStop(stopId) {
      this.lineModal.visible = false;
      this.stopModal = { visible: true, id: stopId };
    },
    openLine(lineId) {
      this.stopModal.visible = false;
      this.lineModal = { visible: true, id: lineId };
    }
  }
};
</script>

<style scoped>
.search-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-card {
  padding: 16px 18px;
}

.search-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.search-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--ink-400);
}

.search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-input-wrap {
  position: relative;
  flex: 1;
  min-width: 220px;
}

.search-input-icon {
  position: absolute;
  top: 50%;
  left: 11px;
  transform: translateY(-50%);
  color: var(--ink-400);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 38px;
  padding-left: 34px;
}

.city-field {
  display: flex;
  align-items: center;
  gap: 7px;
}

.city-label {
  font-size: 12.5px;
  color: var(--ink-500);
  white-space: nowrap;
}

.city-input {
  width: 84px;
  height: 38px;
}

.refresh-toggle {
  padding: 0 4px;
}

.search-submit {
  height: 38px;
  padding: 0 20px;
}

.split-view {
  display: grid;
  grid-template-columns: minmax(320px, 420px) 1fr;
  gap: 16px;
  height: calc(100vh - 300px);
  min-height: 480px;
}

.result-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.result-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.result-list {
  list-style: none;
}

.result-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--ink-100);
  cursor: pointer;
  transition: background-color 0.14s ease;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background: var(--blue-50);
}

.result-main {
  flex: 1;
  min-width: 0;
}

.result-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  font-size: 12px;
  color: var(--ink-500);
}

.result-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--ink-200);
  background: var(--ink-50);
}

.map-panel {
  overflow: hidden;
  min-height: 420px;
}

.spinner-light {
  border-color: rgba(255, 255, 255, 0.4);
  border-top-color: var(--white);
}

@media (max-width: 1080px) {
  .split-view {
    grid-template-columns: 1fr;
  }

  .map-panel {
    min-height: 380px;
  }
}
</style>
