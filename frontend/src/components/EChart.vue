<template>
  <div ref="chart" class="echart" :style="{ height: `${height}px` }" />
</template>

<script>
import * as echarts from 'echarts';

export default {
  name: 'EChart',
  props: {
    option: { type: Object, required: true },
    height: { type: Number, default: 420 }
  },
  data() {
    return { chart: null };
  },
  watch: {
    option: {
      deep: true,
      handler(value) {
        if (this.chart) this.chart.setOption(value, true);
      }
    }
  },
  mounted() {
    this.chart = echarts.init(this.$refs.chart);
    this.chart.setOption(this.option);
    this.resizeObserver = new ResizeObserver(() => this.chart && this.chart.resize());
    this.resizeObserver.observe(this.$refs.chart);
  },
  beforeDestroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  }
};
</script>

<style scoped>
.echart {
  width: 100%;
}
</style>
