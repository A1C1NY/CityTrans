<template>
  <svg
    class="icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, index) in paths" :key="index" :d="d" />
    <circle
      v-for="(c, index) in circles"
      :key="`c-${index}`"
      :cx="c[0]"
      :cy="c[1]"
      :r="c[2]"
    />
  </svg>
</template>

<script>
const ICONS = {
  search: {
    paths: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.35-4.35']
  },
  star: {
    paths: [
      'M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77l-5.2 2.74.99-5.79-4.21-4.1 5.82-.85L12 3.5Z'
    ]
  },
  flame: {
    paths: [
      'M12 3s4.5 4.2 4.5 8.2A4.5 4.5 0 0 1 12 15.7a4.5 4.5 0 0 1-4.5-4.5C7.5 7.2 12 3 12 3Z',
      'M12 21a5 5 0 0 0 5-5c0-1.6-.8-3-1.8-4.2'
    ]
  },
  chart: {
    paths: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2']
  },
  users: {
    paths: [
      'M16 20v-1.6a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20',
      'M9 10.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z',
      'M22 20v-1.6a4 4 0 0 0-3-3.87',
      'M16 3.7a4 4 0 0 1 0 7.75'
    ]
  },
  database: {
    paths: [
      'M12 8c4.42 0 8-1.12 8-2.5S16.42 3 12 3 4 4.12 4 5.5 7.58 8 12 8Z',
      'M4 5.5v13C4 19.88 7.58 21 12 21s8-1.12 8-2.5v-13',
      'M4 12c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5'
    ]
  },
  logout: {
    paths: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9']
  },
  bus: {
    paths: [
      'M6 17h12a1 1 0 0 0 1-1V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a1 1 0 0 0 1 1Z',
      'M4 11h16',
      'M7 17v2',
      'M17 17v2'
    ],
    circles: [[8.5, 14, 1], [15.5, 14, 1]]
  },
  map: {
    paths: [
      'M9 3 3 5.5v16L9 19l6 2.5 6-2.5v-16L15 5.5 9 3Z',
      'M9 3v16',
      'M15 5.5v16'
    ]
  },
  refresh: {
    paths: ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v6h-6']
  },
  close: {
    paths: ['M18 6 6 18', 'M6 6l12 12']
  },
  chevron: {
    paths: ['m9 18 6-6-6-6']
  },
  plus: {
    paths: ['M12 5v14', 'M5 12h14']
  },
  filter: {
    paths: ['M3 5h18', 'M6 12h12', 'M10 19h4']
  },
  clock: {
    paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2']
  },
  pin: {
    paths: [
      'M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 1 1 16 0Z'
    ],
    circles: [[12, 10, 2.6]]
  },
  route: {
    paths: ['M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M9 16h4a4 4 0 0 0 4-4V8']
  },
  info: {
    paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 8h.01']
  }
};

export default {
  name: 'AppIcon',
  props: {
    name: { type: String, required: true },
    size: { type: [Number, String], default: 18 },
    strokeWidth: { type: [Number, String], default: 1.7 }
  },
  computed: {
    icon() {
      return ICONS[this.name] || ICONS.info;
    },
    paths() {
      return this.icon.paths || [];
    },
    circles() {
      return this.icon.circles || [];
    }
  }
};
</script>

<style scoped>
.icon {
  display: block;
  flex-shrink: 0;
}
</style>
