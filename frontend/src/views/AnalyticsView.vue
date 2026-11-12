<template>
  <div class="analytics-view">
    <div class="page-head">
      <div>
        <h1 class="page-title">访问统计</h1>
        <p class="page-subtitle">基于详情访问事件统计站点与线路热度，以及指定对象的时间分布</p>
      </div>
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
      </button>
    </div>

    <!-- 站点访问排行 -->
    <section v-show="activeTab === 'popularity'" class="panel">
      <div class="control-bar card">
        <label class="field">
          <span class="field-label">开始时间</span>
          <input v-model="popularity.start" class="input" type="datetime-local" />
        </label>
        <label class="field">
          <span class="field-label">结束时间</span>
          <input v-model="popularity.end" class="input" type="datetime-local" />
        </label>
        <label class="field">
          <span class="field-label">数量</span>
          <input v-model.number="popularity.limit" class="input limit-input" type="number" min="1" max="100" />
        </label>
        <button class="btn btn-primary" :disabled="popularity.loading" @click="loadPopularity">
          <span v-if="popularity.loading" class="spinner spinner-light" />
          查询
        </button>
      </div>

      <ResultPanel
        :state="popularity.state"
        :message="popularity.message"
        :view="popularity.view"
        @update:view="popularity.view = $event"
      >
        <template #chart>
          <EChart v-if="popularity.chartOption" :option="popularity.chartOption" :height="popularity.chartHeight" />
        </template>
        <template #table>
          <DataTable
            v-if="popularity.rows.length"
            :columns="rankingColumns('站点名称', '站点详情访问次数')"
            :rows="popularity.rows"
          />
        </template>
      </ResultPanel>
    </section>

    <!-- 线路访问排行 -->
    <section v-show="activeTab === 'linePopularity'" class="panel">
      <div class="control-bar card">
        <label class="field">
          <span class="field-label">开始时间</span>
          <input v-model="linePopularity.start" class="input" type="datetime-local" />
        </label>
        <label class="field">
          <span class="field-label">结束时间</span>
          <input v-model="linePopularity.end" class="input" type="datetime-local" />
        </label>
        <label class="field">
          <span class="field-label">数量</span>
          <input v-model.number="linePopularity.limit" class="input limit-input" type="number" min="1" max="100" />
        </label>
        <button class="btn btn-primary" :disabled="linePopularity.loading" @click="loadLinePopularity">
          <span v-if="linePopularity.loading" class="spinner spinner-light" />
          查询
        </button>
      </div>

      <ResultPanel
        :state="linePopularity.state"
        :message="linePopularity.message"
        :view="linePopularity.view"
        @update:view="linePopularity.view = $event"
      >
        <template #chart>
          <EChart
            v-if="linePopularity.chartOption"
            :option="linePopularity.chartOption"
            :height="linePopularity.chartHeight"
          />
        </template>
        <template #table>
          <DataTable
            v-if="linePopularity.rows.length"
            :columns="rankingColumns('线路名称', '线路详情访问次数')"
            :rows="linePopularity.rows"
          />
        </template>
      </ResultPanel>
    </section>

    <!-- 访问时间分布 -->
    <section v-show="activeTab === 'distribution'" class="panel">
      <div class="control-bar card">
        <label class="field">
          <span class="field-label">对象类型</span>
          <select v-model="distribution.targetType" class="select">
            <option value="stop">车站名称</option>
            <option value="line">线路名称</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">名称</span>
          <input
            v-model.trim="distribution.targetName"
            class="input name-input"
            type="text"
            :placeholder="distribution.targetType === 'stop' ? '输入车站名称' : '输入线路名称'"
          />
        </label>
        <label class="field">
          <span class="field-label">开始时间</span>
          <input v-model="distribution.start" class="input" type="datetime-local" />
        </label>
        <label class="field">
          <span class="field-label">结束时间</span>
          <input v-model="distribution.end" class="input" type="datetime-local" />
        </label>
        <label class="field">
          <span class="field-label">聚合粒度</span>
          <select v-model="distribution.bucket" class="select">
            <option value="hour">按小时</option>
            <option value="day">按日期</option>
            <option value="weekday_hour">按星期/小时</option>
          </select>
        </label>
        <button class="btn btn-primary" :disabled="distribution.loading" @click="loadDistribution">
          <span v-if="distribution.loading" class="spinner spinner-light" />
          查询
        </button>
      </div>

      <ResultPanel
        :state="distribution.state"
        :message="distribution.message"
        :view="distribution.view"
        @update:view="distribution.view = $event"
      >
        <template #chart>
          <EChart
            v-if="distribution.chartOption"
            :option="distribution.chartOption"
            :height="distribution.chartHeight"
          />
        </template>
        <template #table>
          <DataTable
            v-if="distribution.rows.length"
            :columns="distributionColumns"
            :rows="distribution.rows"
          />
        </template>
      </ResultPanel>
    </section>
  </div>
</template>

<script>
import EChart from '../components/EChart.vue';
import DataTable from '../components/DataTable.vue';
import ResultPanel from '../components/ResultPanel.vue';
import { apiRequest } from '../api/client';
import { notify } from '../stores/toast';

const BLUE = '#1f6fc4';
const BLUE_DARK = '#175a9f';
const GRID_LINE = '#eef1f5';

function formatLocalDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultRange() {
  const now = new Date();
  const start = new Date(now);
  const originalDay = start.getDate();

  // Move to the target month first, then clamp dates such as March 31 to February 28/29.
  start.setDate(1);
  start.setMonth(start.getMonth() - 1);
  const lastDayOfTargetMonth = new Date(
    start.getFullYear(),
    start.getMonth() + 1,
    0
  ).getDate();
  start.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  start.setHours(0, 0, 0, 0);

  return { start: formatLocalDateTime(start), end: formatLocalDateTime(now) };
}

function createPanelState(extra = {}) {
  return {
    loading: false,
    state: 'idle',
    message: '请设置查询条件后查询',
    view: 'chart',
    rows: [],
    chartOption: null,
    chartHeight: 420,
    ...extra
  };
}

export default {
  name: 'AnalyticsView',
  components: { EChart, DataTable, ResultPanel },
  data() {
    const range = defaultRange();
    return {
      activeTab: 'popularity',
      popularity: createPanelState({ start: range.start, end: range.end, limit: 20 }),
      linePopularity: createPanelState({ start: range.start, end: range.end, limit: 20 }),
      distribution: createPanelState({
        start: range.start,
        end: range.end,
        targetType: 'stop',
        targetName: '',
        bucket: 'hour'
      })
    };
  },
  computed: {
    tabs() {
      return [
        { key: 'popularity', label: '站点访问排行' },
        { key: 'linePopularity', label: '线路访问排行' },
        { key: 'distribution', label: '访问时间分布' }
      ];
    },
    distributionColumns() {
      const bucketLabel = this.distribution.bucket === 'hour'
        ? '小时'
        : this.distribution.bucket === 'day'
          ? '日期'
          : '星期/小时';
      return [
        { key: 'bucket', label: bucketLabel },
        { key: 'detail_view_count', label: '访问次数', align: 'right' }
      ];
    }
  },
  methods: {
    rankingColumns(nameLabel, countLabel) {
      return [
        { key: 'rank', label: '排名', width: '72px' },
        { key: 'name', label: nameLabel },
        { key: 'detail_view_count', label: countLabel, align: 'right' }
      ];
    },
    setLoading(panel) {
      panel.loading = true;
      panel.state = 'loading';
      panel.message = '正在加载';
    },
    setError(panel) {
      panel.state = 'error';
      panel.message = '加载失败';
      panel.rows = [];
      panel.chartOption = null;
    },
    setEmpty(panel) {
      panel.state = 'empty';
      panel.message = '暂无数据';
      panel.rows = [];
      panel.chartOption = null;
    },
    buildRankingOption(items, nameKey, countLabel) {
      const names = items.map((item) => item[nameKey]);
      const counts = items.map((item) => item.detail_view_count ?? 0);
      return {
        color: [BLUE],
        grid: { top: 24, right: 72, bottom: 36, left: 24, containLabel: true },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params) => `${params[0].name}<br>${countLabel}：${params[0].value}`
        },
        xAxis: {
          type: 'value',
          minInterval: 1,
          name: '访问次数',
          nameTextStyle: { color: '#667085' },
          axisLabel: { color: '#667085' },
          axisLine: { lineStyle: { color: '#d0d5dd' } },
          splitLine: { lineStyle: { color: GRID_LINE } }
        },
        yAxis: {
          type: 'category',
          inverse: true,
          data: names,
          axisLabel: { width: 180, overflow: 'truncate', color: '#475467' },
          axisTick: { show: false },
          axisLine: { lineStyle: { color: '#d0d5dd' } }
        },
        series: [{
          type: 'bar',
          data: counts,
          barMaxWidth: 22,
          itemStyle: { color: BLUE, borderRadius: [0, 3, 3, 0] },
          label: { show: true, position: 'right', color: '#475467' },
          emphasis: { itemStyle: { color: BLUE_DARK } }
        }]
      };
    },
    renderRanking(panel, items, nameKey, countLabel) {
      if (!items.length) {
        this.setEmpty(panel);
        return;
      }
      panel.state = 'ready';
      panel.rows = items.map((item, index) => ({
        rank: index + 1,
        name: item[nameKey],
        detail_view_count: item.detail_view_count ?? 0
      }));
      panel.chartOption = this.buildRankingOption(items, nameKey, countLabel);
      panel.chartHeight = Math.max(420, items.length * 34 + 90);
    },
    async loadPopularity() {
      const panel = this.popularity;
      this.setLoading(panel);
      try {
        const params = new URLSearchParams({ limit: panel.limit || 20 });
        if (panel.start) params.append('start_at', panel.start);
        if (panel.end) params.append('end_at', panel.end);
        const data = await apiRequest(`/analytics/stops/popularity?${params}`);
        this.renderRanking(panel, data.items || [], 'stop_name', '站点详情访问次数');
      } catch (error) {
        this.setError(panel);
      } finally {
        panel.loading = false;
      }
    },
    async loadLinePopularity() {
      const panel = this.linePopularity;
      this.setLoading(panel);
      try {
        const params = new URLSearchParams({ limit: panel.limit || 20 });
        if (panel.start) params.append('start_at', panel.start);
        if (panel.end) params.append('end_at', panel.end);
        const data = await apiRequest(`/analytics/lines/popularity?${params}`);
        this.renderRanking(panel, data.items || [], 'line_name', '线路详情访问次数');
      } catch (error) {
        this.setError(panel);
      } finally {
        panel.loading = false;
      }
    },
    async loadDistribution() {
      const panel = this.distribution;
      if (!panel.targetName) {
        notify(`请输入${panel.targetType === 'stop' ? '车站' : '线路'}名称`, 'error');
        return;
      }

      this.setLoading(panel);
      try {
        const params = new URLSearchParams({ bucket: panel.bucket });
        if (panel.start) params.append('start_at', panel.start);
        if (panel.end) params.append('end_at', panel.end);
        params.append('name', panel.targetName);
        if (panel.targetType === 'line') params.append('actor_scope', 'all');

        const endpoint = panel.targetType === 'stop'
          ? '/analytics/stops/view-distribution-by-name'
          : '/analytics/lines/view-distribution-by-name';
        const data = await apiRequest(`${endpoint}?${params}`);
        this.renderDistribution(panel, data.items || [], panel.bucket);
      } catch (error) {
        this.setError(panel);
      } finally {
        panel.loading = false;
      }
    },
    renderDistribution(panel, items, bucket) {
      if (!items.length) {
        this.setEmpty(panel);
        return;
      }

      panel.state = 'ready';
      panel.rows = items.map((item) => ({
        bucket: item.bucket ?? item.time_bucket ?? '',
        detail_view_count: item.detail_view_count ?? item.count ?? item.view_count ?? 0
      }));

      if (bucket === 'weekday_hour') {
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const heatmapData = items.map((item) => {
          const [weekday, hour] = String(item.bucket).split('-').map(Number);
          return [hour, weekday, item.detail_view_count ?? 0];
        });
        const maxValue = Math.max(1, ...heatmapData.map((item) => item[2]));
        panel.chartOption = {
          tooltip: {
            formatter: (params) => `${weekdays[params.value[1]]} ${String(params.value[0]).padStart(2, '0')}:00<br>访问次数：${params.value[2]}`
          },
          grid: { top: 24, right: 42, bottom: 76, left: 64 },
          xAxis: {
            type: 'category',
            data: Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`),
            splitArea: { show: true },
            axisLabel: { color: '#667085' },
            axisLine: { lineStyle: { color: '#d0d5dd' } }
          },
          yAxis: {
            type: 'category',
            data: weekdays,
            splitArea: { show: true },
            axisLabel: { color: '#667085' },
            axisLine: { lineStyle: { color: '#d0d5dd' } }
          },
          visualMap: {
            min: 0,
            max: maxValue,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 8,
            inRange: { color: ['#edf5fd', '#78b4e8', BLUE] }
          },
          series: [{
            type: 'heatmap',
            data: heatmapData,
            emphasis: { itemStyle: { borderColor: '#333', borderWidth: 1 } }
          }]
        };
        panel.chartHeight = 420;
        return;
      }

      const labels = items.map((item) => bucket === 'hour'
        ? `${String(item.bucket).padStart(2, '0')}:00`
        : String(item.bucket));
      const counts = items.map((item) => item.detail_view_count ?? item.count ?? item.view_count ?? 0);

      panel.chartOption = {
        color: [BLUE],
        grid: { top: 30, right: 36, bottom: 62, left: 58 },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: labels,
          axisLabel: { rotate: bucket === 'day' ? 35 : 0, hideOverlap: true, color: '#667085' },
          axisLine: { lineStyle: { color: '#d0d5dd' } }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          name: '访问次数',
          nameTextStyle: { color: '#667085' },
          axisLabel: { color: '#667085' },
          axisLine: { lineStyle: { color: '#d0d5dd' } },
          splitLine: { lineStyle: { color: GRID_LINE } }
        },
        series: [{
          type: 'line',
          data: counts,
          smooth: true,
          symbolSize: 7,
          itemStyle: { color: BLUE },
          lineStyle: { color: BLUE, width: 2 },
          areaStyle: { color: 'rgba(31, 111, 196, 0.12)' }
        }]
      };
      panel.chartHeight = 420;
    }
  }
};
</script>

<style scoped>
.analytics-view {
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

.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.control-bar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 18px;
}

.limit-input {
  width: 88px;
}

.name-input {
  width: 190px;
}

.spinner-light {
  border-color: rgba(255, 255, 255, 0.4);
  border-top-color: var(--white);
}
</style>
