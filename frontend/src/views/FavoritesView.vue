<template>
  <div class="favorites-view">
    <div class="page-head">
      <div>
        <h1 class="page-title">我的收藏</h1>
        <p class="page-subtitle">收藏的站点与线路会保存在账号下，随时快速打开</p>
      </div>
      <button class="btn btn-secondary" :disabled="loading" @click="load">
        <AppIcon name="refresh" :size="15" />
        刷新
      </button>
    </div>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ 'is-active': activeTab === tab.key }"
        type="button"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span class="tab-count">{{ tab.key === 'stops' ? stops.length : lines.length }}</span>
      </button>
    </div>

    <div v-if="loading" class="loading-row">
      <span class="spinner" />
      正在加载收藏…
    </div>

    <template v-else>
      <div v-if="activeTab === 'stops'">
        <div v-if="!stops.length" class="empty-state card">
          <AppIcon name="star" :size="26" />
          <strong>还没有收藏站点</strong>
          <span>在搜索结果或站点详情中点击星标即可收藏</span>
        </div>

        <div v-else class="fav-grid">
          <article
            v-for="item in stops"
            :key="item.stop.id"
            class="fav-card card"
            @click="openStop(item.stop.id)"
          >
            <div class="fav-card-head">
              <span class="fav-icon"><AppIcon name="pin" :size="16" /></span>
              <FavoriteButton active @toggle="removeStop(item.stop.id)" />
            </div>
            <h3 class="fav-title">{{ item.stop.stop_name }}</h3>
            <p class="fav-meta">{{ item.stop.longitude }}, {{ item.stop.latitude }}</p>
            <p class="fav-foot">收藏于 {{ formatDate(item.created_at) }}</p>
          </article>
        </div>
      </div>

      <div v-else>
        <div v-if="!lines.length" class="empty-state card">
          <AppIcon name="star" :size="26" />
          <strong>还没有收藏线路</strong>
          <span>在线路详情中点击收藏即可加入这里</span>
        </div>

        <div v-else class="fav-grid">
          <article
            v-for="item in lines"
            :key="item.line.id"
            class="fav-card card"
            @click="openLine(item.line.id)"
          >
            <div class="fav-card-head">
              <span class="fav-icon"><AppIcon name="route" :size="16" /></span>
              <FavoriteButton active @toggle="removeLine(item.line.id)" />
            </div>
            <h3 class="fav-title">{{ item.line.line_name || item.line.amap_name }}</h3>
            <p class="fav-meta">
              {{ item.line.start_stop_name || '—' }} → {{ item.line.end_stop_name || '—' }}
            </p>
            <p class="fav-foot">收藏于 {{ formatDate(item.created_at) }}</p>
          </article>
        </div>
      </div>
    </template>

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
import FavoriteButton from '../components/FavoriteButton.vue';
import StopDetailModal from '../components/StopDetailModal.vue';
import LineDetailModal from '../components/LineDetailModal.vue';
import { apiRequest } from '../api/client';
import { toggleStopFavorite, toggleLineFavorite } from '../stores/favorites';
import { notify } from '../stores/toast';

export default {
  name: 'FavoritesView',
  components: { AppIcon, FavoriteButton, StopDetailModal, LineDetailModal },
  data() {
    return {
      loading: false,
      activeTab: 'stops',
      stops: [],
      lines: [],
      stopModal: { visible: false, id: null },
      lineModal: { visible: false, id: null }
    };
  },
  computed: {
    tabs() {
      return [
        { key: 'stops', label: '收藏站点' },
        { key: 'lines', label: '收藏线路' }
      ];
    }
  },
  created() {
    this.load();
  },
  methods: {
    formatDate(value) {
      if (!value) return '—';
      return new Date(value).toLocaleDateString('zh-CN');
    },
    async load() {
      this.loading = true;
      try {
        const [stopsData, linesData] = await Promise.all([
          apiRequest('/me/favorite-stops?page_size=100'),
          apiRequest('/me/favorite-lines?page_size=100')
        ]);
        this.stops = stopsData.items || [];
        this.lines = linesData.items || [];
      } catch (error) {
        /* 已提示 */
      } finally {
        this.loading = false;
      }
    },
    async removeStop(stopId) {
      try {
        await toggleStopFavorite(stopId);
        this.stops = this.stops.filter((item) => item.stop.id !== stopId);
        notify('已取消收藏', 'info');
      } catch (error) {
        /* 已提示 */
      }
    },
    async removeLine(lineId) {
      try {
        await toggleLineFavorite(lineId);
        this.lines = this.lines.filter((item) => item.line.id !== lineId);
        notify('已取消收藏', 'info');
      } catch (error) {
        /* 已提示 */
      }
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
.favorites-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  align-self: flex-start;
  border-radius: var(--radius-sm);
  background: var(--ink-100);
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 15px;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--ink-600);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tab.is-active {
  background: var(--white);
  color: var(--blue-700);
  box-shadow: var(--shadow-xs);
}

.tab-count {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--ink-200);
  color: var(--ink-600);
  font-size: 11px;
  font-weight: 600;
}

.tab.is-active .tab-count {
  background: var(--blue-100);
  color: var(--blue-700);
}

.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.fav-card {
  padding: 15px 16px;
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.fav-card:hover {
  border-color: var(--blue-300);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.fav-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.fav-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: var(--blue-50);
  color: var(--blue-600);
}

.fav-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav-meta {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--ink-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav-foot {
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid var(--ink-100);
  font-size: 11.5px;
  color: var(--ink-400);
}
</style>
