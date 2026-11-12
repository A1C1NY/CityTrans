<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <span class="brand-mark">
          <AppIcon name="bus" :size="22" />
        </span>
        <h1>公交查询系统</h1>
        <p>高德公交站点与线路查询分析</p>
      </div>

      <div class="auth-tabs">
        <button
          class="auth-tab"
          :class="{ 'is-active': mode === 'login' }"
          type="button"
          @click="switchMode('login')"
        >
          登录
        </button>
        <button
          class="auth-tab"
          :class="{ 'is-active': mode === 'register' }"
          type="button"
          @click="switchMode('register')"
        >
          注册
        </button>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <label class="field">
          <span class="field-label">用户名</span>
          <input
            v-model.trim="username"
            class="input"
            type="text"
            autocomplete="username"
            placeholder="请输入用户名"
            required
          />
        </label>

        <label class="field">
          <span class="field-label">密码</span>
          <input
            v-model="password"
            class="input"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            :placeholder="mode === 'login' ? '请输入密码' : '8-128 个字符'"
            required
          />
        </label>

        <p v-if="mode === 'register'" class="auth-hint">
          密码长度需为 8-128 个字符。
        </p>

        <button class="btn btn-primary btn-block auth-submit" type="submit" :disabled="submitting">
          <span v-if="submitting" class="spinner spinner-light" />
          {{ submitting ? '处理中…' : mode === 'login' ? '登录' : '注册' }}
        </button>
      </form>

      <p class="auth-switch">
        {{ mode === 'login' ? '还没有账号？' : '已有账号？' }}
        <a href="#" @click.prevent="switchMode(mode === 'login' ? 'register' : 'login')">
          {{ mode === 'login' ? '立即注册' : '返回登录' }}
        </a>
      </p>
    </div>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue';
import { login, register } from '../stores/auth';
import { notify } from '../stores/toast';
import { loadFavorites } from '../stores/favorites';

export default {
  name: 'LoginView',
  components: { AppIcon },
  data() {
    return {
      mode: 'login',
      username: '',
      password: '',
      submitting: false
    };
  },
  methods: {
    switchMode(mode) {
      this.mode = mode;
      this.password = '';
    },
    async submit() {
      if (this.submitting) return;
      this.submitting = true;
      try {
        if (this.mode === 'login') {
          await login(this.username, this.password);
          await loadFavorites();
          notify('登录成功', 'success');
          const redirect = this.$route.query.redirect;
          this.$router.replace(redirect || { name: 'search' });
        } else {
          await register(this.username, this.password);
          notify('注册成功，请登录', 'success');
          this.mode = 'login';
          this.password = '';
        }
      } catch (error) {
        if (error.code === 'PASSWORD_INVALID') {
          notify(error.message, 'warning');
        }
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style scoped>
/* 纯白背景，后续可替换为图片 */
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--white);
}

.auth-card {
  width: 100%;
  max-width: 380px;
  padding: 34px 32px 28px;
  border: 1px solid var(--ink-200);
  border-radius: var(--radius-lg);
  background: var(--white);
  box-shadow: var(--shadow-sm);
}

.auth-brand {
  text-align: center;
  margin-bottom: 24px;
}

.brand-mark {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: 12px;
  border-radius: var(--radius-md);
  background: var(--blue-600);
  color: var(--white);
}

.auth-brand h1 {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink-900);
}

.auth-brand p {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--ink-500);
}

.auth-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  margin-bottom: 20px;
  border-radius: var(--radius-sm);
  background: var(--ink-100);
}

.auth-tab {
  flex: 1;
  height: 32px;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--ink-600);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.auth-tab.is-active {
  background: var(--white);
  color: var(--blue-700);
  box-shadow: var(--shadow-xs);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-hint {
  margin-top: -4px;
  font-size: 12px;
  color: var(--ink-500);
}

.auth-submit {
  height: 38px;
  margin-top: 4px;
}

.spinner-light {
  border-color: rgba(255, 255, 255, 0.4);
  border-top-color: var(--white);
}

.auth-switch {
  margin-top: 18px;
  text-align: center;
  font-size: 12.5px;
  color: var(--ink-500);
}

.auth-switch a {
  font-weight: 500;
}
</style>
