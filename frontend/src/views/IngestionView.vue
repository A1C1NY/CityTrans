<template>
  <div class="ingestion-view">
    <div class="page-head">
      <div>
        <h1 class="page-title">导入记录</h1>
        <p class="page-subtitle">查看高德补数任务的执行结果与错误详情</p>
      </div>
      <button class="btn btn-secondary" :disabled="loading" @click="load">
        <AppIcon name="refresh" :size="15" />
        刷新
      </button>
    </div>

    <section class="card">
      <header class="card-header">
        <span class="card-title">运行记录</span>
        <span class="badge">{{ total }} 条</span>
      </header>

      <div v-if="loading" class="loading-row">
        <span class="spinner" />
        正在加载导入记录…
      </div>

      <div v-else-if="!runs.length" class="empty-state">
        <AppIcon name="database" :size="26" />
        <strong>暂无导入记录</strong>
      </div>

      <div v-else class="table-scroll">
        <table class="run-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>接口</th>
              <th>触发方式</th>
              <th>关键词</th>
              <th>状态</th>
              <th>接收 / 插入 / 更新 / 失败</th>
              <th>开始时间</th>
              <th class="col-actions">详情</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="run in runs" :key="run.id">
              <td class="cell-mono">{{ run.id }}</td>
              <td><span class="endpoint">{{ run.endpoint }}</span></td>
              <td>
                <span class="badge" :class="run.trigger_type === 'manual' ? 'badge-blue' : ''">
                  {{ triggerLabel(run.trigger_type) }}
                </span>
              </td>
              <td>{{ run.request_keyword || '—' }}</td>
              <td>
                <span class="badge" :class="statusClass(run.status)">{{ run.status }}</span>
              </td>
              <td>
                <div class="counts">
                  <span class="count">{{ run.received_count }}</span>
                  <span class="count-sep">/</span>
                  <span class="count is-ok">{{ run.inserted_count }}</span>
                  <span class="count-sep">/</span>
                  <span class="count is-warn">{{ run.updated_count }}</span>
                  <span class="count-sep">/</span>
                  <span class="count" :class="{ 'is-bad': run.failed_count > 0 }">{{ run.failed_count }}</span>
                </div>
              </td>
              <td class="cell-time">{{ formatDate(run.started_at) }}</td>
              <td class="col-actions">
                <button class="btn btn-secondary btn-sm" @click="openDetail(run.id)">查看</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <BaseModal :visible="detail.visible" @close="detail.visible = false">
      <template #header>
        <h2 class="modal-title">导入运行 #{{ detail.run ? detail.run.id : '' }}</h2>
      </template>

      <div v-if="detail.loading" class="loading-row">
        <span class="spinner" />
        正在加载详情…
      </div>

      <div v-else-if="detail.run" class="detail-body">
        <div class="detail-grid">
          <div class="detail-cell">
            <span class="detail-label">接口</span>
            <span class="detail-value">{{ detail.run.endpoint }}</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">触发方式</span>
            <span class="detail-value">{{ triggerLabel(detail.run.trigger_type) }}</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">关键词</span>
            <span class="detail-value">{{ detail.run.request_keyword || '—' }}</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">城市编码</span>
            <span class="detail-value">{{ detail.run.city_code || '—' }}</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">状态</span>
            <span class="detail-value">{{ detail.run.status }}</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">开始时间</span>
            <span class="detail-value">{{ formatDate(detail.run.started_at) }}</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">结束时间</span>
            <span class="detail-value">{{ formatDate(detail.run.finished_at) }}</span>
          </div>
          <div class="detail-cell">
            <span class="detail-label">接收 / 插入 / 更新 / 跳过 / 失败</span>
            <span class="detail-value">
              {{ detail.run.received_count }} / {{ detail.run.inserted_count }} /
              {{ detail.run.updated_count }} / {{ detail.run.skipped_count }} /
              {{ detail.run.failed_count }}
            </span>
          </div>
        </div>

        <div class="error-block">
          <span class="detail-label">错误信息</span>
          <pre class="error-text">{{ detail.run.error_message || '无' }}</pre>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue';
import BaseModal from '../components/BaseModal.vue';
import { apiRequest } from '../api/client';

export default {
  name: 'IngestionView',
  components: { AppIcon, BaseModal },
  data() {
    return {
      loading: false,
      runs: [],
      total: 0,
      detail: { visible: false, loading: false, run: null }
    };
  },
  created() {
    this.load();
  },
  methods: {
    formatDate(value) {
      if (!value) return '—';
      return new Date(value).toLocaleString('zh-CN');
    },
    triggerLabel(value) {
      const labels = { manual: '手动', search: '搜索触发', on_demand: '按需', scheduled: '定时' };
      return labels[value] || value;
    },
    statusClass(status) {
      if (status === 'success' || status === 'completed') return 'badge-success';
      if (status === 'failed' || status === 'error') return 'badge-danger';
      if (status === 'partial') return 'badge-warning';
      return '';
    },
    async load() {
      this.loading = true;
      try {
        const data = await apiRequest('/admin/ingestion-runs?page_size=100');
        this.runs = data.items || [];
        this.total = data.total ?? this.runs.length;
      } catch (error) {
        /* 已提示 */
      } finally {
        this.loading = false;
      }
    },
    async openDetail(runId) {
      this.detail = { visible: true, loading: true, run: null };
      try {
        this.detail.run = await apiRequest(`/admin/ingestion-runs/${runId}`);
      } catch (error) {
        this.detail.visible = false;
      } finally {
        this.detail.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.ingestion-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-scroll {
  overflow-x: auto;
}

.run-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.run-table thead th {
  padding: 10px 16px;
  background: var(--ink-50);
  border-bottom: 1px solid var(--ink-200);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--ink-500);
  text-align: left;
  white-space: nowrap;
}

.run-table tbody td {
  padding: 11px 16px;
  border-bottom: 1px solid var(--ink-100);
  color: var(--ink-700);
  vertical-align: middle;
}

.run-table tbody tr:last-child td {
  border-bottom: none;
}

.run-table tbody tr {
  transition: background-color 0.13s ease;
}

.run-table tbody tr:hover {
  background: var(--blue-50);
}

.endpoint {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--ink-600);
}

.cell-mono {
  font-variant-numeric: tabular-nums;
  color: var(--ink-500);
}

.counts {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-variant-numeric: tabular-nums;
  font-size: 12.5px;
}

.count {
  color: var(--ink-600);
}

.count.is-ok {
  color: #027a48;
}

.count.is-warn {
  color: #b54708;
}

.count.is-bad {
  color: var(--danger);
  font-weight: 600;
}

.count-sep {
  color: var(--ink-300);
}

.cell-time {
  font-size: 12.5px;
  color: var(--ink-500);
  white-space: nowrap;
}

.col-actions {
  text-align: right;
  white-space: nowrap;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink-900);
}

.detail-body {
  padding: 18px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  margin-bottom: 16px;
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

.error-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.error-text {
  padding: 12px 14px;
  border: 1px solid var(--ink-200);
  border-radius: var(--radius-sm);
  background: var(--ink-50);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--ink-700);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 220px;
  overflow-y: auto;
}
</style>
