<template>
  <div class="result-panel card">
    <header class="result-head">
      <span class="result-title">结果</span>
      <div class="view-switch">
        <button
          class="view-btn"
          :class="{ 'is-active': view === 'chart' }"
          type="button"
          @click="$emit('update:view', 'chart')"
        >
          图表
        </button>
        <button
          class="view-btn"
          :class="{ 'is-active': view === 'table' }"
          type="button"
          @click="$emit('update:view', 'table')"
        >
          表格
        </button>
      </div>
    </header>

    <div class="result-body">
      <div v-if="state === 'loading'" class="loading-row">
        <span class="spinner" />
        {{ message }}
      </div>

      <div v-else-if="state === 'idle' || state === 'empty' || state === 'error'" class="empty-state">
        <AppIcon :name="state === 'error' ? 'info' : 'chart'" :size="26" />
        <strong>{{ state === 'error' ? '加载失败' : state === 'empty' ? '暂无数据' : '等待查询' }}</strong>
        <span>{{ message }}</span>
      </div>

      <div v-else-if="view === 'chart'" class="chart-slot">
        <slot name="chart" />
      </div>

      <div v-else class="table-slot">
        <slot name="table" />
      </div>
    </div>
  </div>
</template>

<script>
import AppIcon from './AppIcon.vue';

export default {
  name: 'ResultPanel',
  components: { AppIcon },
  props: {
    state: { type: String, default: 'idle' },
    message: { type: String, default: '' },
    view: { type: String, default: 'chart' }
  }
};
</script>

<style scoped>
.result-panel {
  overflow: hidden;
}

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 16px;
  border-bottom: 1px solid var(--ink-200);
}

.result-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-800);
}

.view-switch {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: var(--radius-xs);
  background: var(--ink-100);
}

.view-btn {
  height: 26px;
  padding: 0 12px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--ink-600);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.view-btn.is-active {
  background: var(--white);
  color: var(--blue-700);
  box-shadow: var(--shadow-xs);
}

.result-body {
  min-height: 420px;
  padding: 16px;
}

.chart-slot,
.table-slot {
  width: 100%;
}
</style>
