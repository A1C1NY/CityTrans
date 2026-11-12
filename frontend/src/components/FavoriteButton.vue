<template>
  <button
    class="fav-btn"
    :class="{ 'is-active': active, 'is-large': large }"
    type="button"
    :title="active ? '取消收藏' : '收藏'"
    @click.stop="$emit('toggle')"
  >
    <svg viewBox="0 0 24 24" :width="large ? 15 : 16" :height="large ? 15 : 16">
      <path
        d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77l-5.2 2.74.99-5.79-4.21-4.1 5.82-.85L12 3.5Z"
        :fill="active ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
    </svg>
    <span v-if="large">{{ active ? '已收藏' : '收藏' }}</span>
  </button>
</template>

<script>
export default {
  name: 'FavoriteButton',
  props: {
    active: { type: Boolean, default: false },
    large: { type: Boolean, default: false }
  }
};
</script>

<style scoped>
.fav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--ink-400);
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.fav-btn:hover {
  background: var(--ink-100);
  color: var(--warning);
}

.fav-btn.is-active {
  color: var(--warning);
}

.fav-btn.is-large {
  width: auto;
  height: 30px;
  padding: 0 11px;
  border-color: var(--ink-300);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-600);
}

.fav-btn.is-large:hover {
  border-color: var(--warning);
  background: #fffaeb;
  color: #b54708;
}

.fav-btn.is-large.is-active {
  border-color: #fec84b;
  background: #fffaeb;
  color: #b54708;
}
</style>
