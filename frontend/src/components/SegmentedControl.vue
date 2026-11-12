<template>
  <div class="segmented" role="tablist">
    <button
      v-for="option in options"
      :key="option.value"
      class="segmented-item"
      :class="{ 'is-active': option.value === value }"
      type="button"
      role="tab"
      :aria-selected="option.value === value"
      @click="$emit('input', option.value)"
    >
      <AppIcon v-if="option.icon" :name="option.icon" :size="15" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<script>
import AppIcon from './AppIcon.vue';

export default {
  name: 'SegmentedControl',
  components: { AppIcon },
  props: {
    value: { type: [String, Number], required: true },
    options: { type: Array, required: true }
  }
};
</script>

<style scoped>
.segmented {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-sm);
  background: var(--ink-100);
}

.segmented-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 13px;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--ink-600);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.segmented-item:hover {
  color: var(--ink-900);
}

.segmented-item.is-active {
  background: var(--white);
  color: var(--blue-700);
  box-shadow: var(--shadow-xs);
}
</style>
