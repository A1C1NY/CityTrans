<template>
  <transition name="modal">
    <div v-if="visible" class="modal-mask" @mousedown.self="close">
      <div class="modal-panel" :class="{ 'is-large': large }" role="dialog" aria-modal="true">
        <header class="modal-head">
          <div class="modal-head-main">
            <slot name="header" />
          </div>
          <button class="modal-close" type="button" aria-label="关闭" @click="close">
            <AppIcon name="close" :size="17" />
          </button>
        </header>
        <div class="modal-body scroll-area">
          <slot />
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import AppIcon from './AppIcon.vue';

export default {
  name: 'BaseModal',
  components: { AppIcon },
  props: {
    visible: { type: Boolean, default: false },
    large: { type: Boolean, default: false }
  },
  methods: {
    close() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(16, 24, 40, 0.42);
  backdrop-filter: blur(2px);
}

.modal-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 620px;
  max-height: 86vh;
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-panel.is-large {
  max-width: 1120px;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--ink-200);
}

.modal-head-main {
  flex: 1;
  min-width: 0;
}

.modal-close {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--ink-500);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.modal-close:hover {
  background: var(--ink-100);
  color: var(--ink-800);
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.modal-enter,
.modal-leave-to {
  opacity: 0;
}

.modal-enter .modal-panel,
.modal-leave-to .modal-panel {
  transform: translateY(8px) scale(0.99);
  opacity: 0;
}

@media (max-width: 720px) {
  .modal-mask {
    padding: 0;
  }

  .modal-panel {
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
  }
}
</style>
