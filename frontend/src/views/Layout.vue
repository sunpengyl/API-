<template>
  <div>
    <el-container class="layout-container">
      <el-aside :width="sidebarWidth" class="sidebar" :class="{ collapsed: isCollapsed }">
        <div class="logo">
          <h2>{{ isCollapsed ? 'API' : 'API 巡检平台' }}</h2>
        </div>
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapsed"
          router
          background-color="#1c2434"
          text-color="#cbd5e1"
          active-text-color="#f8fafc"
        >
          <el-menu-item index="/home">
            <el-icon><House /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/tasks">
            <el-icon><Document /></el-icon>
            <span>任务管理</span>
          </el-menu-item>
          <el-menu-item index="/results">
            <el-icon><DataLine /></el-icon>
            <span>巡检记录</span>
          </el-menu-item>
          <el-menu-item index="/alerts">
            <el-icon><Bell /></el-icon>
            <span>告警记录</span>
          </el-menu-item>
          <el-menu-item index="/health">
            <el-icon><TrendCharts /></el-icon>
            <span>健康度分析</span>
          </el-menu-item>
        </el-menu>

        <div class="sidebar-footer">
          <button class="collapse-toggle" type="button" @click="toggleSidebar">
            <el-icon class="collapse-icon">
              <Fold v-if="!isCollapsed" />
              <Expand v-else />
            </el-icon>
          </button>
        </div>
      </el-aside>

      <el-container>
        <el-header class="header">
          <div class="header-title">{{ currentTitle }}</div>
          <div class="header-user">
            <el-dropdown @command="handleCommand">
              <span class="user-info">
                <el-icon><User /></el-icon>
                <span>{{ username }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>{{ roleText }}</el-dropdown-item>
                  <el-dropdown-item divided command="changePassword">修改密码</el-dropdown-item>
                  <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>

    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="400px">
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="90px"
      >
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import {
  ArrowDown,
  Bell,
  DataLine,
  Document,
  Expand,
  Fold,
  House,
  TrendCharts,
  User,
} from '@element-plus/icons-vue';
import { authApi } from '../api/auth';

const route = useRoute();
const router = useRouter();

const activeMenu = computed(() => route.path);
const currentTitle = computed(() => (route.meta.title as string) || 'API 巡检平台');
const isCollapsed = ref(false);
const sidebarWidth = computed(() => (isCollapsed.value ? '72px' : '220px'));

const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
const username = computed(() => userInfo.username || '未知用户');
const roleText = computed(() => {
  const roleMap: Record<string, string> = {
    admin: '管理员',
    developer: '开发者',
    readonly: '只读用户',
  };
  return roleMap[userInfo.role] || userInfo.role || '未知角色';
});

const passwordDialogVisible = ref(false);
const passwordFormRef = ref<FormInstance>();
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      trigger: 'blur',
      validator: (_rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'));
          return;
        }

        callback();
      },
    },
  ],
};

const resetPasswordForm = () => {
  passwordForm.oldPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
  passwordFormRef.value?.clearValidate();
};

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

const handleCommand = (command: string) => {
  if (command === 'logout') {
    handleLogout();
    return;
  }

  if (command === 'changePassword') {
    resetPasswordForm();
    passwordDialogVisible.value = true;
  }
};

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await authApi.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    ElMessage.success('已退出登录');
    router.push('/login');
  } catch {
    // ignore
  }
};

const handleChangePassword = async () => {
  try {
    await passwordFormRef.value?.validate();
    await authApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
    ElMessage.success('密码修改成功，请重新登录');
    passwordDialogVisible.value = false;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  } catch (error: any) {
    ElMessage.error(error?.message || '修改密码失败');
  }
};
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #1c2434;
  overflow-x: hidden;
  transition: width 0.22s ease;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1c2434;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo h2 {
  color: #f8fafc;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

:deep(.sidebar .el-menu) {
  border-right: 0;
  flex: 1;
}

:deep(.sidebar .el-menu-item) {
  margin: 4px 10px;
  border-radius: 12px;
}

:deep(.sidebar .el-menu-item.is-active) {
  background: rgba(59, 130, 246, 0.16);
}

.collapse-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-left: auto;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.collapse-toggle:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #f8fafc;
  transform: translateY(-1px);
}

.collapse-icon {
  font-size: 18px;
}

.sidebar-footer {
  display: flex;
  justify-content: flex-end;
  padding: 14px 16px 16px;
  margin-top: auto;
  background: #1c2434;
}

.sidebar.collapsed .logo h2 {
  font-size: 16px;
}

.sidebar.collapsed .sidebar-footer {
  justify-content: center;
  padding: 12px 0 16px;
}

.sidebar.collapsed .collapse-toggle {
  border-radius: 14px;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.header-user {
  color: #4b5563;
}

.user-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.main-content {
  background-color: #f3f4f6;
  padding: 10px 12px;
}
</style>
