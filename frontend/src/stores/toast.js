import Vue from 'vue';

export const toastState = Vue.observable({ items: [] });

let seed = 0;

export function notify(message, type = 'info', duration = 3200) {
  const id = ++seed;
  toastState.items.push({ id, message, type });
  window.setTimeout(() => dismiss(id), duration);
  return id;
}

export function dismiss(id) {
  const index = toastState.items.findIndex((item) => item.id === id);
  if (index !== -1) toastState.items.splice(index, 1);
}
