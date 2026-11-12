import Vue from 'vue';
import App from './App.vue';
import router from './router';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/base.css';

Vue.config.productionTip = false;

new Vue({
  router,
  render: (h) => h(App)
}).$mount('#app');
