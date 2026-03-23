<template>
  <div class="signup-container">
    <!-- 左侧表单区域 -->
    <div class="form-section">
      <div class="form-content">
        <div class="logo">
          <img src="@/assets/images/firefox.png" alt="Logo" />
        </div>
        
        <div class="form-header">
          <h4>API 巡检平台</h4>
          <h2>Sign up</h2>
        </div>

        <el-form ref="formRef" :model="signupForm" :rules="rules" @submit.prevent="handleSignup">
          <el-form-item prop="phone">
            <el-input 
              v-model="signupForm.phone" 
              placeholder="手机号" 
              size="large"
              class="custom-input"
            />
          </el-form-item>

          <el-form-item prop="code">
            <div class="code-input-wrapper">
              <el-input
                v-model="signupForm.code"
                placeholder="验证码"
                size="large"
                class="code-input"
              />
              <el-button
                type="primary"
                size="large"
                class="code-btn-inline"
                @click="getCode"
              >
                获取验证码
              </el-button>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleSignup"
              class="signup-btn"
            >
              注册
            </el-button>
          </el-form-item>
        </el-form>

        <div class="social-login">
          <p>使用社交平台注册</p>
          <div class="social-icons">
            <span class="social-icon">📱</span>
            <span class="social-icon">💬</span>
            <span class="social-icon">👤</span>
            <span class="social-icon">🌐</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧插图区域 -->
    <div class="illustration-section">
      <div class="illustration-content">
        <div class="prompt-text">
          <h3>已经有账号了？</h3>
          <p>如果您已经有账号</p>
          <p>请使用您的用户名和密码登录。</p>
          <button class="outline-btn" @click="goToLogin">登录</button>
        </div>
        <div class="illustration-image">
          <img src="@/assets/images/project-completed.svg" alt="Project Completed" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const router = useRouter();
const formRef = ref();
const loading = ref(false);

const signupForm = reactive({
  phone: '',
  code: '',
});

const rules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
};

const getCode = () => {
  if (!signupForm.phone) {
    ElMessage.warning('请先输入手机号');
    return;
  }
  ElMessage.success('验证码已发送');
};

const goToLogin = () => {
  router.push('/login');
};

const handleSignup = async () => {
  try {
    await formRef.value.validate();
    loading.value = true;
    
    // TODO: 实现注册逻辑
    ElMessage.info('注册功能开发中...');
  } catch (error: any) {
    ElMessage.error(error?.message || '注册失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.signup-container {
  display: flex;
  min-height: 100vh;
  background: #fff;
}

/* 左侧表单区域 */
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

/* 验证码输入框容器 */
.code-input-wrapper {
  position: relative;
  background: #f0f0f0;
  border-radius: 25px;
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 56px;
}

:deep(.code-input) {
  flex: 1;
  display: flex;
  align-items: center;
}

:deep(.code-input .el-input__wrapper) {
  background: transparent;
  border: none;
  border-radius: 25px;
  padding: 8px 20px;
  box-shadow: none;
  width: 100%;
  height: 100%;
}

:deep(.code-input .el-input__wrapper:hover),
:deep(.code-input .el-input__wrapper.is-focus) {
  background: transparent;
  box-shadow: none;
}

:deep(.code-input .el-input__inner) {
  color: #333;
}

:deep(.code-input .el-input__inner::placeholder) {
  color: #999;
}

/* 验证码按钮（内嵌样式）*/
.code-btn-inline {
  border-radius: 20px !important;
  background: linear-gradient(135deg, #5b8def 0%, #4d7cef 100%) !important;
  border: none !important;
  font-weight: 600;
  white-space: nowrap;
  padding: 0 30px !important;
  margin: 4px 4px 4px 0 !important;
  flex-shrink: 0;
  height: calc(100% - 8px) !important;
  min-height: unset !important;
  line-height: normal !important;
}

.code-btn-inline:hover {
  background: linear-gradient(135deg, #4d7cef 0%, #3d6cdf 100%) !important;
}

/* 注册按钮 */
.signup-btn {
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

.signup-btn:hover {
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

/* 右侧插图区域 */
.illustration-section {
  flex: 1;
  background: linear-gradient(135deg, #1e9eff 0%, #00d4ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  position: relative;
  border-radius: 0 0 0 44% / 0 0 0 130%;
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
