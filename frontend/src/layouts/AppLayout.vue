<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">
          <AppIcon name="bus" :size="19" />
        </span>
        <span class="brand-text">
          <strong>公交查询系统</strong>
          <small>Amap Transit</small>
        </span>
      </div>

      <nav class="nav">
        <p class="nav-group">查询</p>
        <router-link
          v-for="item in primaryNav"
          :key="item.name"
          :to="{ name: item.name }"
          class="nav-item"
          active-class="is-active"
        >
          <AppIcon :name="item.icon" :size="17" />
          <span>{{ item.label }}</span>
        </router-link>

        <template v-if="analystNav.length">
          <p class="nav-group">分析</p>
          <router-link
            v-for="item in analystNav"
            :key="item.name"
            :to="{ name: item.name }"
            class="nav-item"
            active-class="is-active"
          >
            <AppIcon :name="item.icon" :size="17" />
            <span>{{ item.label }}</span>
          </router-link>
        </template>

        <template v-if="adminNav.length">
          <p class="nav-group">管理</p>
          <router-link
            v-for="item in adminNav"
            :key="item.name"
            :to="{ name: item.name }"
            class="nav-item"
            active-class="is-active"
          >
            <AppIcon :name="item.icon" :size="17" />
            <span>{{ item.label }}</span>
          </router-link>
        </template>
      </nav>

      <div class="sidebar-footer">
        <div class="user-card">
          <span class="avatar">{{ initial }}</span>
          <span class="user-meta">
            <strong>{{ user.username }}</strong>
            <small>{{ roleLabel }}</small>
          </span>
          <button class="icon-btn" title="退出登录" @click="handleLogout">
            <AppIcon name="logout" :size="16" />
          </button>
        </div>
      </div>
    </aside>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue';
import { authState, logout, roleName, isAnalyst, isAdmin } from '../stores/auth';
import { resetFavorites } from '../stores/favorites';

export default {
  name: 'AppLayout',
  components: { AppIcon },
  data() {
    return {
      primaryNav: [
        { name: 'search', label: '站点搜索', icon: 'search' },
        { name: 'favorites', label: '我的收藏', icon: 'star' }
      ]
    };
  },
  computed: {
    user() {
      return authState.user || { username: '', role: '' };
    },
    initial() {
      return (this.user.username || '?').slice(0, 1).toUpperCase();
    },
    roleLabel() {
      return roleName(this.user.role);
    },
    analystNav() {
      if (!isAnalyst()) return [];
      return [
        { name: 'heatmap', label: '密度热力图', icon: 'flame' },
        { name: 'analytics', label: '访问统计', icon: 'chart' }
      ];
    },
    adminNav() {
      if (!isAdmin()) return [];
      return [
        { name: 'admin', label: '用户管理', icon: 'users' },
        { name: 'ingestion', label: '导入记录', icon: 'database' }
      ];
    }
  },
  methods: {
    handleLogout() {
      logout();
      resetFavorites();
      this.$router.push({ name: 'login' });
    }
  }
};
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  background: var(--ink-50);
}

/* 侧边栏：白色为主，无圆角 */
.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--white);
  border-right: 1px solid var(--ink-200);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--header-height);
  padding: 0 18px;
  border-bottom: 1px solid var(--ink-200);
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--blue-600);
  color: var(--white);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand-text strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
}

.brand-text small {
  font-size: 10.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-400);
}

.nav {
  flex: 1;
  padding: 14px 10px;
  overflow-y: auto;
}

.nav-group {
  padding: 12px 10px 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-400);
}

.nav-group:first-child {
  padding-top: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 10px;
  margin-bottom: 2px;
  border-radius: var(--radius-sm);
  color: var(--ink-600);
  font-size: 13.5px;
  font-weight: 500;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.nav-item:hover {
  background: var(--ink-50);
  color: var(--ink-900);
}

.nav-item.is-active {
  background: var(--blue-50);
  color: var(--blue-700);
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--ink-200);
}

.user-card {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px;
  border-radius: var(--radius-sm);
  background: var(--ink-50);
}

.avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--blue-100);
  color: var(--blue-700);
  font-size: 12.5px;
  font-weight: 600;
}

.user-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.3;
}

.user-meta strong {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-800);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-meta small {
  font-size: 11px;
  color: var(--ink-500);
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--ink-500);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.icon-btn:hover {
  background: var(--white);
  color: var(--danger);
}

.main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 24px 28px 32px;
}

@media (max-width: 900px) {
  .layout {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }

  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--ink-200);
  }

  .nav {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 10px;
  }

  .nav-group {
    display: none;
  }

  .nav-item {
    margin-bottom: 0;
  }

  .sidebar-footer {
    display: none;
  }

  .main {
    padding: 16px;
  }
}
</style>
