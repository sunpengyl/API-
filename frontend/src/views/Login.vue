<template>
  <div class="login-container">
    <!-- 左侧插图区域 -->
    <div class="illustration-section">
      <div class="illustration-content">
        <div class="prompt-text">
          <h3>还没有账号？</h3>
          <p>如果您还没有账号</p>
          <p>请使用手机号注册，这样您就可以获得一个账号。</p>
          <button class="outline-btn" @click="toggleMode">注册</button>
        </div>
        <div class="illustration-image">
          <img src="@/assets/images/work-time.svg" alt="Work Time" />
        </div>
      </div>
    </div>

    <!-- 右侧表单区域 -->
    <div class="form-section">
      <div class="form-content">
        <div class="logo">
          <img src="@/assets/images/firefox.png" alt="Logo" />
        </div>
        
        <div class="form-header">
          <h4>API 巡检平台</h4>
          <h2>Login</h2>
        </div>

        <el-form ref="formRef" :model="loginForm" :rules="rules" @submit.prevent="handleLogin">
          <el-form-item prop="username">
            <el-input 
              v-model="loginForm.username" 
              placeholder="用户名" 
              size="large"
              class="custom-input"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="密码"
              size="large"
              show-password
              class="custom-input"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleLogin"
              class="login-btn"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="social-login">
          <p>使用社交平台登录</p>
          <div class="social-icons">
            <span class="social-icon">📱</span>
            <span class="social-icon">💬</span>
            <span class="social-icon">👤</span>
            <span class="social-icon">🌐</span>
          </div>
        </div>
      </div>
    </div>
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

const toggleMode = () => {
  router.push('/signup');
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
  min-height: 100vh;
  background: #fff;
}

/* 左侧插图区域 */
.illustration-section {
  flex: 1;
  background: linear-gradient(135deg, #1e9eff 0%, #00d4ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  position: relative;
  border-radius: 0 0 50% 0 / 0 0 120% 0;
}

.illustration-content {
  max-width: 500px;
  color: white;
  text-align: center;
}

.prompt-text h3 {
  font-size: 28px;
  margin-bottom: 15px;
  font-weight: 600;
}

.prompt-text p {
  font-size: 14px;
  margin: 8px 0;
  opacity: 0.95;
  line-height: 1.6;
}

.outline-btn {
  margin-top: 25px;
  padding: 12px 45px;
  background: transparent;
  border: 2px solid white;
  color: white;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.outline-btn:hover {
  background: white;
  color: #1e9eff;
}

.illustration-image {
  margin-top: 50px;
}

.illustration-image img {
  max-width: 100%;
  height: auto;
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.1));
}

/* 右侧表单区域 */
.form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: #ffffff;
}

.form-content {
  width: 100%;
  max-width: 420px;
}

.logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo img {
  height: 50px;
  width: auto;
}

.form-header {
  text-align: center;
  margin-bottom: 40px;
}

.form-header h4 {
  font-size: 14px;
  color: #666;
  margin: 0 0 10px;
  font-weight: 400;
}

.form-header h2 {
  font-size: 36px;
  color: #333;
  margin: 0;
  font-weight: 700;
}

/* 自定义输入框样式 */
:deep(.custom-input .el-input__wrapper) {
  background: #f0f0f0;
  border: none;
  border-radius: 25px;
  padding: 8px 20px;
  box-shadow: none;
}

:deep(.custom-input .el-input__wrapper:hover),
:deep(.custom-input .el-input__wrapper.is-focus) {
  background: #e8e8e8;
  box-shadow: none;
}

:deep(.custom-input .el-input__inner) {
  color: #333;
}

:deep(.custom-input .el-input__inner::placeholder) {
  color: #999;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  border-radius: 25px;
  background: linear-gradient(135deg, #5b8def 0%, #4d7cef 100%);
  border: none;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  margin-top: 10px;
  height: 48px;
}

.login-btn:hover {
  background: linear-gradient(135deg, #4d7cef 0%, #3d6cdf 100%);
}

/* 社交登录 */
.social-login {
  text-align: center;
  margin-top: 30px;
}

.social-login p {
  font-size: 13px;
  color: #666;
  margin-bottom: 15px;
}

.social-icons {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.social-icon {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.social-icon:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .illustration-section {
    display: none;
  }
  
  .form-section {
    flex: 1;
  }
}
</style>
