<template>
  <div id="app-root">
    <router-view />
    <ToastStack />
  </div>
</template>

<script>
import ToastStack from './components/ToastStack.vue';
import { authState, loadCurrentUser } from './stores/auth';

export default {
  name: 'App',
  components: { ToastStack },
  created() {
    if (authState.token && !authState.user) {
      loadCurrentUser();
    } else {
      authState.ready = true;
    }
  }
};
</script>
