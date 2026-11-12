<template>
  <label class="switch" :class="{ 'is-on': value, 'is-disabled': disabled }">
    <input
      type="checkbox"
      :checked="value"
      :disabled="disabled"
      @change="$emit('input', $event.target.checked)"
    />
    <span class="switch-track">
      <span class="switch-thumb" />
    </span>
    <span class="switch-label">
      <slot />
    </span>
  </label>
</template>

<script>
export default {
  name: 'ToggleSwitch',
  props: {
    value: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  }
};
</script>

<style scoped>
.switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.switch.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-track {
  position: relative;
  width: 34px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--ink-300);
  transition: background-color 0.18s ease;
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--white);
  box-shadow: var(--shadow-xs);
  transition: transform 0.18s ease;
}

.switch.is-on .switch-track {
  background: var(--blue-600);
}

.switch.is-on .switch-thumb {
  transform: translateX(14px);
}

.switch-label {
  font-size: 13px;
  color: var(--ink-600);
}
</style>
