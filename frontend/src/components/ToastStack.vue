<template>
  <div class="toast-stack">
    <transition-group name="toast">
      <div
        v-for="item in items"
        :key="item.id"
        class="toast"
        :class="`toast-${item.type}`"
        @click="dismiss(item.id)"
      >
        <span class="toast-dot" />
        <span class="toast-text">{{ item.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { toastState, dismiss } from '../stores/toast';

export default {
  name: 'ToastStack',
  computed: {
    items() {
      return toastState.items;
    }
  },
  methods: { dismiss }
};
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 220px;
  max-width: 460px;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  background: var(--white);
  border: 1px solid var(--ink-200);
  box-shadow: var(--shadow-md);
  font-size: 13px;
  color: var(--ink-800);
  pointer-events: auto;
  cursor: pointer;
}

.toast-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--blue-500);
}

.toast-success .toast-dot {
  background: var(--success);
}

.toast-error .toast-dot {
  background: var(--danger);
}

.toast-warning .toast-dot {
  background: var(--warning);
}

.toast-text {
  flex: 1;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
