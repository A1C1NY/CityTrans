<template>
  <div class="data-table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :style="{ width: column.width, textAlign: column.align || 'left' }"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="index">
          <td
            v-for="column in columns"
            :key="column.key"
            :style="{ textAlign: column.align || 'left' }"
          >
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]" :index="index">
              <span :class="{ 'cell-mono': column.mono }">{{ row[column.key] }}</span>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'DataTable',
  props: {
    columns: { type: Array, required: true },
    rows: { type: Array, required: true }
  }
};
</script>

<style scoped>
.data-table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--ink-200);
  border-radius: var(--radius-md);
  background: var(--white);
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.data-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 11px 16px;
  background: var(--ink-50);
  border-bottom: 1px solid var(--ink-200);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--ink-500);
  white-space: nowrap;
}

.data-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--ink-100);
  color: var(--ink-700);
  vertical-align: middle;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr {
  transition: background-color 0.13s ease;
}

.data-table tbody tr:hover {
  background: var(--blue-50);
}

.cell-mono {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
</style>
