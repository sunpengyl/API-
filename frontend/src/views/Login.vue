<template>
  <div class="login-container">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="login-header">
          <h2>API 巡检平台</h2>
          <p>用户登录</p>
        </div>
      </template>

      <el-form ref="formRef" :model="loginForm" :rules="rules" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="loginForm.username" placeholder="用户名" size="large">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            style="width: 100%"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-tips">
        <p>请使用管理员账号登录</p>
        <p>首次初始化后请尽快修改默认密码</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { authApi } from '../api/auth';

const router = useRouter();
const formRef = ref();
const loading = ref(false);

const loginForm = reactive({
  username: '',
  password: '',
});

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const handleLogin = async () => {
  try {
    await formRef.value.validate();
    loading.value = true;

    const authData: any = await authApi.login(loginForm.username, loginForm.password);
    if (!authData?.token || !authData?.user) {
      throw new Error('登录响应格式不正确');
    }

    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(authData.user));

    ElMessage.success('登录成功');
    router.push('/tasks');
  } catch (error: any) {
    if (!error?.response) {
      ElMessage.error(error?.message || '登录失败');
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.22), transparent 28%),
    radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.18), transparent 24%),
    linear-gradient(135deg, #e0f2fe 0%, #eef2ff 52%, #f8fafc 100%);
}

.login-card {
  width: 400px;
  border-radius: 22px;
}

.login-header {
  text-align: center;
}

.login-header h2 {
  margin: 0 0 10px;
  color: #111827;
  font-size: 26px;
}

.login-header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.login-tips {
  text-align: center;
  margin-top: 18px;
  color: #6b7280;
  font-size: 12px;
}

.login-tips p {
  margin: 5px 0;
}
</style>
