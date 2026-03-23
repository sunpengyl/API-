<template>
  <router-view />
</template>

<script setup lang="ts">
// App根组件
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}


:root {
  --el-color-primary: #005daa;
  --el-color-primary-light-3: #3380bd;
  --el-color-primary-light-5: #66a0d0;
  --el-color-primary-light-7: #99c0e2;
  --el-color-primary-light-8: #b3d0ec;
  --el-color-primary-light-9: #cce0f5;
  --el-color-primary-dark-2: #004a88;
  --el-border-radius-base: 8px;
}

.el-button {
  border-radius: 8px;
  height: 36px;
  padding: 0 18px;
  font-weight: 600;
  font-size: 14px;
}

.el-button.is-round {
  border-radius: 999px;
}

.el-button--primary {
  --el-button-hover-bg-color: #004a88;
  --el-button-hover-border-color: #004a88;
  --el-button-active-bg-color: #003b6d;
  --el-button-active-border-color: #003b6d;
}

.el-button.is-disabled,
.el-button.is-disabled:hover,
.el-button.is-disabled:focus,
.el-button.is-disabled:active {
  color: #999;
}

.el-button.btn-outline {
  background-color: transparent;
  color: #1f1f1f;
  border-color: var(--el-color-primary);
}

.el-button.btn-outline:hover,
.el-button.btn-outline:focus {
  background-color: transparent;
  color: #1f1f1f;
  border-color: var(--el-color-primary);
}

/* el-table 公共样式 */
.el-table {
  color: #1f1f1f;
}

.el-table th.el-table__cell {
  background-color: #f3f4f5;
  color: #1f1f1f;
  font-weight: 600;
}

.el-table .el-table__cell {
  padding: 0;
}

.el-table .cell {
  line-height: 38px;
}

.el-table tr {
  height: 38px;
}

/* 圆点状态文字（6*6） */
.status-dot {
  display: inline-flex;
  align-items: center;
}

.status-dot::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  margin-right: 6px;
  flex: 0 0 auto;
}

.text-initial {
  color: #c2c7cc;
}

.text-warning {
  color: #ffaf00;
}

.text-progress {
  color: #005daa;
}

.text-complete {
  color: #666;
}

.text-success {
  color: #63a103;
}

.text-danger {
  color: #db3700;
}

/* 操作列文字颜色（覆盖状态类用） */
.op-text-initial {
  color: #005daa;
  font-size: 14px;
}

.op-text-warning {
  color: #999;
  font-size: 14px;
}

/* 副标题公共样式 */
.label-title {
  display: inline-flex;
  align-items: center;
  padding-left: 10px;
  border-left: 4px solid #005daa;
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
  line-height: 20px;
}

.item-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.item-title .title-bar {
  width: 4px;
  height: 14px;
  background-color: #005daa;
  border-radius: 2px;
}

.item-title .title {
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
}

#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
    '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
