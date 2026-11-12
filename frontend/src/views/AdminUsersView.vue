<template>
  <div class="admin-view">
    <div class="page-head">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-subtitle">创建账号、调整角色与启用状态；后端始终是权限的最终判断</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <AppIcon name="plus" :size="15" />
        创建用户
      </button>
    </div>

    <section class="card">
      <header class="card-header">
        <span class="card-title">用户列表</span>
        <div class="header-tools">
          <span class="badge">{{ total }} 个账号</span>
          <button class="btn btn-secondary btn-sm" :disabled="loading" @click="load">
            <AppIcon name="refresh" :size="14" />
            刷新
          </button>
        </div>
      </header>

      <div v-if="loading" class="loading-row">
        <span class="spinner" />
        正在加载用户…
      </div>

      <div v-else-if="!users.length" class="empty-state">
        <AppIcon name="users" :size="26" />
        <strong>暂无用户</strong>
      </div>

      <div v-else class="table-scroll">
        <table class="user-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>角色</th>
              <th>状态</th>
              <th>创建时间</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                <div class="user-cell">
                  <span class="user-avatar">{{ user.username.slice(0, 1).toUpperCase() }}</span>
                  <div class="user-cell-main">
                    <span class="user-name">{{ user.username }}</span>
                    <span class="user-id">ID {{ user.id }}</span>
                  </div>
                </div>
              </td>
              <td>
                <select
                  class="select role-select"
                  :value="user.role"
                  :aria-label="`设置 ${user.username} 的角色`"
                  @change="changeRole(user, $event.target.value)"
                >
                  <option value="passenger">普通用户</option>
                  <option value="analyst">分析师</option>
                  <option value="admin">管理员</option>
                </select>
              </td>
              <td>
                <span class="status-pill" :class="user.is_active ? 'is-on' : 'is-off'">
                  <span class="status-dot" />
                  {{ user.is_active ? '启用' : '停用' }}
                </span>
              </td>
              <td class="cell-time">{{ formatDate(user.created_at) }}</td>
              <td class="col-actions">
                <button
                  class="btn btn-sm"
                  :class="user.is_active ? 'btn-danger' : 'btn-secondary'"
                  @click="toggleStatus(user)"
                >
                  {{ user.is_active ? '停用' : '启用' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <BaseModal :visible="modal.visible" @close="modal.visible = false">
      <template #header>
        <h2 class="modal-title">创建用户</h2>
      </template>

      <form class="create-form" @submit.prevent="submitCreate">
        <label class="field">
          <span class="field-label">用户名</span>
          <input v-model.trim="modal.username" class="input" type="text" placeholder="3-64 个字符" required />
        </label>
        <label class="field">
          <span class="field-label">密码</span>
          <input v-model="modal.password" class="input" type="password" placeholder="8-128 个字符" required />
        </label>
        <label class="field">
          <span class="field-label">角色</span>
          <select v-model="modal.role" class="select">
            <option value="passenger">普通用户</option>
            <option value="analyst">分析师</option>
            <option value="admin">管理员</option>
          </select>
        </label>

        <div class="form-actions">
          <button class="btn btn-secondary" type="button" @click="modal.visible = false">取消</button>
          <button class="btn btn-primary" type="submit" :disabled="modal.submitting">
            <span v-if="modal.submitting" class="spinner spinner-light" />
            保存
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue';
import BaseModal from '../components/BaseModal.vue';
import { apiRequest } from '../api/client';
import { notify } from '../stores/toast';

export default {
  name: 'AdminUsersView',
  components: { AppIcon, BaseModal },
  data() {
    return {
      loading: false,
      users: [],
      total: 0,
      modal: {
        visible: false,
        username: '',
        password: '',
        role: 'passenger',
        submitting: false
      }
    };
  },
  created() {
    this.load();
  },
  methods: {
    formatDate(value) {
      if (!value) return '—';
      return new Date(value).toLocaleString('zh-CN');
    },
    async load() {
      this.loading = true;
      try {
        const data = await apiRequest('/admin/users?page_size=100');
        this.users = data.items || [];
        this.total = data.total ?? this.users.length;
      } catch (error) {
        /* 已提示 */
      } finally {
        this.loading = false;
      }
    },
    openCreate() {
      this.modal = {
        visible: true,
        username: '',
        password: '',
        role: 'passenger',
        submitting: false
      };
    },
    async submitCreate() {
      if (this.modal.submitting) return;
      this.modal.submitting = true;
      try {
        await apiRequest('/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            username: this.modal.username,
            password: this.modal.password,
            role: this.modal.role
          })
        });
        notify('用户创建成功', 'success');
        this.modal.visible = false;
        await this.load();
      } catch (error) {
        /* 已提示 */
      } finally {
        this.modal.submitting = false;
      }
    },
    async toggleStatus(user) {
      try {
        await apiRequest(`/admin/users/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: !user.is_active })
        });
        notify('用户状态更新成功', 'success');
        await this.load();
      } catch (error) {
        /* 已提示 */
      }
    },
    async changeRole(user, role) {
      if (role === user.role) return;
      try {
        await apiRequest(`/admin/users/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ role })
        });
        notify('用户角色更新成功', 'success');
        await this.load();
      } catch (error) {
        // Reload to restore the server-side role after a rejected update.
        await this.load();
      }
    }
  }
};
</script>

<style scoped>
.admin-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.table-scroll {
  overflow-x: auto;
}

.user-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.user-table thead th {
  padding: 10px 18px;
  background: var(--ink-50);
  border-bottom: 1px solid var(--ink-200);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--ink-500);
  text-align: left;
  white-space: nowrap;
}

.user-table tbody td {
  padding: 12px 18px;
  border-bottom: 1px solid var(--ink-100);
  color: var(--ink-700);
  vertical-align: middle;
}

.user-table tbody tr:last-child td {
  border-bottom: none;
}

.user-table tbody tr {
  transition: background-color 0.13s ease;
}

.user-table tbody tr:hover {
  background: var(--blue-50);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--blue-100);
  color: var(--blue-700);
  font-size: 12px;
  font-weight: 600;
}

.user-cell-main {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-900);
}

.user-id {
  font-size: 11px;
  color: var(--ink-400);
}

.role-select {
  height: 30px;
  min-width: 104px;
  font-size: 12.5px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.status-pill.is-on {
  background: #ecfdf3;
  color: #027a48;
}

.status-pill.is-off {
  background: var(--ink-100);
  color: var(--ink-500);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.cell-time {
  font-size: 12.5px;
  color: var(--ink-500);
  white-space: nowrap;
}

.col-actions {
  text-align: right;
  white-space: nowrap;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink-900);
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.spinner-light {
  border-color: rgba(255, 255, 255, 0.4);
  border-top-color: var(--white);
}
</style>
