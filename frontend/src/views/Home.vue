<template>
  <div class="home-page">
    <section class="hero-panel">
      <div class="hero-head">
        <div>
          <div class="eyebrow">SMART MONITOR CENTER</div>
          <h1 class="hero-title">API 巡检监控大盘</h1>
          <p class="hero-subtitle">实时聚合任务状态、告警数量、健康评分与响应时间趋势</p>
        </div>
        <div class="hero-actions">
          <el-select v-model="timeRange" size="large" style="width: 160px" @change="loadDashboard">
            <el-option label="最近 1 小时" :value="1" />
            <el-option label="最近 6 小时" :value="6" />
            <el-option label="最近 24 小时" :value="24" />
            <el-option label="最近 7 天" :value="168" />
          </el-select>
          <el-button type="primary" size="large" :loading="loading" @click="loadDashboard">
            刷新看板
          </el-button>
        </div>
      </div>

      <div class="metric-grid">
        <div class="metric-tile tile-cyan">
          <div class="metric-label">任务总数</div>
          <div class="metric-value">{{ summary.totalTasks }}</div>
          <div class="metric-foot">启用 {{ summary.enabledTasks }} 个任务</div>
        </div>
        <div class="metric-tile tile-blue">
          <div class="metric-label">平均健康度</div>
          <div class="metric-value">{{ summary.avgScore }}</div>
          <div class="metric-foot">优秀/良好 {{ summary.healthyTasks }} 个</div>
        </div>
        <div class="metric-tile tile-orange">
          <div class="metric-label">活跃告警</div>
          <div class="metric-value">{{ summary.activeAlerts }}</div>
          <div class="metric-foot">近窗告警 {{ summary.historyAlerts }} 条</div>
        </div>
        <div class="metric-tile tile-violet">
          <div class="metric-label">平均响应时间</div>
          <div class="metric-value">{{ summary.avgResponseTime }}ms</div>
          <div class="metric-foot">成功率 {{ summary.successRate }}%</div>
        </div>
      </div>
    </section>

    <section class="dashboard-grid">
      <el-card class="dashboard-card chart-large" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>响应与成功率趋势</span>
            <span class="panel-meta">最近 {{ timeRangeLabel }}</span>
          </div>
        </template>
        <div ref="trendChartRef" class="chart-host chart-host-large"></div>
      </el-card>

      <el-card class="dashboard-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>健康等级分布</span>
            <span class="panel-meta">任务画像</span>
          </div>
        </template>
        <div ref="healthRingRef" class="chart-host chart-host-small"></div>
      </el-card>

      <el-card class="dashboard-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>任务平均响应排行</span>
            <span class="panel-meta">Top {{ responseRanking.length }}</span>
          </div>
        </template>
        <div ref="responseBarRef" class="chart-host chart-host-medium"></div>
      </el-card>

      <el-card class="dashboard-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>最近告警</span>
            <span class="panel-meta">{{ recentAlerts.length }} 条</span>
          </div>
        </template>
        <div class="alert-list">
          <div v-for="alert in recentAlerts" :key="alert.id" class="alert-item">
            <div class="alert-main">
              <div class="alert-title">{{ alert.title }}</div>
              <div class="alert-message">{{ alert.message || '无详细描述' }}</div>
            </div>
            <div class="alert-side">
              <el-tag size="small" :type="getSeverityType(alert.severity)">
                {{ getSeverityText(alert.severity) }}
              </el-tag>
              <span class="alert-time">{{ formatTime(alert.triggeredAt) }}</span>
            </div>
          </div>
          <div v-if="recentAlerts.length === 0" class="empty-state">当前时间窗口内暂无告警</div>
        </div>
      </el-card>

      <el-card class="dashboard-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>任务健康概览</span>
            <span class="panel-meta">点击可跳转健康页</span>
          </div>
        </template>
        <div class="task-list">
          <div
            v-for="item in topHealthTasks"
            :key="item.taskId"
            class="task-item"
            @click="goHealth(item.taskId)"
          >
            <div>
              <div class="task-name">{{ item.taskName }}</div>
              <div class="task-help">成功率 {{ item.successRate }}% · 平均 {{ item.avgResponseTime }}ms</div>
            </div>
            <div class="task-score-group">
              <div class="task-score">{{ item.score }}</div>
              <el-tag size="small" :type="getLevelTagType(item.level)">
                {{ getLevelText(item.level) }}
              </el-tag>
            </div>
          </div>
          <div v-if="topHealthTasks.length === 0" class="empty-state">暂无健康度数据</div>
        </div>
      </el-card>

      <el-card class="dashboard-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>执行状态分布</span>
            <span class="panel-meta">{{ statusSegments.length }} 组采样</span>
          </div>
        </template>
        <div ref="statusMiniRef" class="chart-host chart-host-medium"></div>
      </el-card>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import { alertApi } from '../api/alert';
import { healthApi } from '../api/health';
import { historyApi } from '../api/history';
import { taskApi } from '../api/task';

interface TaskItem {
  id: string;
  name: string;
  enabled?: boolean;
}

interface HealthOverviewItem {
  taskId: string;
  taskName: string;
  score: number;
  level: string;
  successRate: number;
  avgResponseTime: number;
  validationPassRate: number;
  calculatedAt: string;
}

interface HistoryItem {
  taskId: string;
  executedAt: string;
  success: boolean;
  responseTime: number;
}

interface AlertItem {
  id: string;
  title: string;
  message?: string;
  severity: string;
  triggeredAt: string;
}

const router = useRouter();
const loading = ref(false);
const timeRange = ref(24);

const tasks = ref<TaskItem[]>([]);
const healthOverview = ref<HealthOverviewItem[]>([]);
const recentResults = ref<HistoryItem[]>([]);
const activeAlerts = ref<AlertItem[]>([]);
const alertHistory = ref<AlertItem[]>([]);

const trendChartRef = ref<HTMLDivElement>();
const healthRingRef = ref<HTMLDivElement>();
const responseBarRef = ref<HTMLDivElement>();
const statusMiniRef = ref<HTMLDivElement>();

let trendChart: echarts.ECharts | null = null;
let healthRingChart: echarts.ECharts | null = null;
let responseBarChart: echarts.ECharts | null = null;
let statusMiniChart: echarts.ECharts | null = null;

const timeRangeLabel = computed(() => {
  const map: Record<number, string> = { 1: '1 小时', 6: '6 小时', 24: '24 小时', 168: '7 天' };
  return map[timeRange.value] || `${timeRange.value} 小时`;
});

const summary = computed(() => {
  const totalTasks = tasks.value.length;
  const enabledTasks = tasks.value.filter((item) => item.enabled !== false).length;
  const avgScore = healthOverview.value.length
    ? Math.round(healthOverview.value.reduce((sum, item) => sum + Number(item.score || 0), 0) / healthOverview.value.length)
    : 0;
  const avgResponseTime = recentResults.value.length
    ? Math.round(recentResults.value.reduce((sum, item) => sum + Number(item.responseTime || 0), 0) / recentResults.value.length)
    : 0;
  const successCount = recentResults.value.filter((item) => item.success).length;
  const successRate = recentResults.value.length ? Math.round((successCount / recentResults.value.length) * 100) : 0;

  return {
    totalTasks,
    enabledTasks,
    avgScore,
    avgResponseTime,
    successRate,
    activeAlerts: activeAlerts.value.length,
    historyAlerts: alertHistory.value.length,
    healthyTasks: healthOverview.value.filter((item) => ['excellent', 'good'].includes(item.level)).length,
  };
});

const topHealthTasks = computed(() => [...healthOverview.value].sort((a, b) => b.score - a.score).slice(0, 6));
const recentAlerts = computed(() => alertHistory.value.slice(0, 5));
const responseRanking = computed(() =>
  [...healthOverview.value].filter((item) => item.avgResponseTime >= 0).sort((a, b) => b.avgResponseTime - a.avgResponseTime).slice(0, 6)
);

const statusSegments = computed(() => {
  const sorted = [...recentResults.value].sort((a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime());
  return sorted.slice(-12).map((item) => ({
    time: new Date(item.executedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    success: item.success ? 1 : 0,
    failure: item.success ? 0 : 1,
  }));
});

const getHistoryRange = () => {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - timeRange.value * 60 * 60 * 1000);
  return { startTime: startTime.toISOString(), endTime: endTime.toISOString() };
};

const loadDashboard = async () => {
  loading.value = true;
  try {
    const range = getHistoryRange();
    const [tasksData, healthData, activeAlertsData, alertHistoryData, historyData] = await Promise.all([
      taskApi.getTasks(),
      healthApi.getAllTasksHealth(timeRange.value),
      alertApi.getActiveAlerts(),
      alertApi.getAlertHistory({ page: 1, pageSize: 20, startTime: range.startTime, endTime: range.endTime }),
      historyApi.queryHistory({ page: 1, pageSize: 60, startTime: range.startTime, endTime: range.endTime }),
    ]);

    tasks.value = Array.isArray(tasksData) ? (tasksData as TaskItem[]) : [];
    healthOverview.value = Array.isArray(healthData) ? (healthData as HealthOverviewItem[]) : [];
    activeAlerts.value = Array.isArray(activeAlertsData) ? (activeAlertsData as AlertItem[]) : [];
    alertHistory.value = Array.isArray((alertHistoryData as any)?.alerts) ? ((alertHistoryData as any).alerts as AlertItem[]) : [];
    recentResults.value = Array.isArray((historyData as any)?.results) ? ((historyData as any).results as HistoryItem[]) : [];

    await nextTick();
    renderCharts();
  } finally {
    loading.value = false;
  }
};

const renderCharts = () => {
  renderTrendChart();
  renderHealthRingChart();
  renderResponseBarChart();
  renderStatusMiniChart();
};

const renderTrendChart = () => {
  if (!trendChartRef.value) return;
  if (!trendChart) trendChart = echarts.init(trendChartRef.value);

  const points = [...recentResults.value].sort((a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime()).slice(-20);

  trendChart.setOption({
    backgroundColor: 'transparent',
    color: ['#67e8f9', '#60a5fa', '#f59e0b'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderColor: 'rgba(148, 163, 184, 0.18)',
      textStyle: { color: '#e2e8f0' },
    },
    legend: {
      top: 2,
      textStyle: { color: '#94a3b8' },
      data: ['成功率', '平均响应时间', '健康评分'],
    },
    grid: { top: 40, left: 24, right: 24, bottom: 18, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((item) => new Date(item.executedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })),
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.35)' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: { show: true, lineStyle: { color: 'rgba(51, 65, 85, 0.4)' } },
    },
    yAxis: [
      {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.4)' } },
      },
      {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '成功率',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 3, shadowBlur: 18, shadowColor: 'rgba(103, 232, 249, 0.35)' },
        data: points.map((item) => (item.success ? 100 : 0)),
      },
      {
        name: '平均响应时间',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'diamond',
        symbolSize: 7,
        lineStyle: { width: 3, shadowBlur: 18, shadowColor: 'rgba(96, 165, 250, 0.28)' },
        data: points.map((item) => item.responseTime),
      },
      {
        name: '健康评分',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, type: 'dashed' },
        data: points.map(() => summary.value.avgScore),
      },
    ],
  });
};

const renderHealthRingChart = () => {
  if (!healthRingRef.value) return;
  if (!healthRingChart) healthRingChart = echarts.init(healthRingRef.value);

  const levelMap: Record<string, number> = { excellent: 0, good: 0, warning: 0, critical: 0 };
  healthOverview.value.forEach((item) => {
    levelMap[item.level] = (levelMap[item.level] || 0) + 1;
  });

  healthRingChart.setOption({
    backgroundColor: 'transparent',
    color: ['#22c55e', '#60a5fa', '#f59e0b', '#f87171'],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      textStyle: { color: '#e2e8f0' },
    },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
    series: [
      {
        type: 'pie',
        radius: ['54%', '76%'],
        center: ['50%', '46%'],
        label: { color: '#cbd5e1' },
        labelLine: { lineStyle: { color: '#64748b' } },
        data: [
          { name: '优秀', value: levelMap.excellent },
          { name: '良好', value: levelMap.good },
          { name: '预警', value: levelMap.warning },
          { name: '严重', value: levelMap.critical },
        ],
      },
    ],
  });
};

const renderResponseBarChart = () => {
  if (!responseBarRef.value) return;
  if (!responseBarChart) responseBarChart = echarts.init(responseBarRef.value);

  const data = [...responseRanking.value].reverse();
  responseBarChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      textStyle: { color: '#e2e8f0' },
    },
    grid: { top: 12, left: 12, right: 18, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.4)' } },
    },
    yAxis: {
      type: 'category',
      data: data.map((item) => item.taskName),
      axisLabel: { color: '#cbd5e1' },
      axisLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        barWidth: 12,
        itemStyle: {
          borderRadius: 999,
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: '#60a5fa' },
            { offset: 1, color: '#22d3ee' },
          ]),
        },
        data: data.map((item) => item.avgResponseTime),
      },
    ],
  });
};

const renderStatusMiniChart = () => {
  if (!statusMiniRef.value) return;
  if (!statusMiniChart) statusMiniChart = echarts.init(statusMiniRef.value);

  statusMiniChart.setOption({
    backgroundColor: 'transparent',
    color: ['#22c55e', '#fb7185'],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      textStyle: { color: '#e2e8f0' },
    },
    legend: { top: 0, textStyle: { color: '#94a3b8' }, data: ['成功', '失败'] },
    grid: { top: 32, left: 16, right: 16, bottom: 12, containLabel: true },
    xAxis: {
      type: 'category',
      data: statusSegments.value.map((item) => item.time),
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.28)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.4)' } },
    },
    series: [
      { name: '成功', type: 'bar', stack: 'total', barWidth: 12, data: statusSegments.value.map((item) => item.success) },
      { name: '失败', type: 'bar', stack: 'total', barWidth: 12, data: statusSegments.value.map((item) => item.failure) },
    ],
  });
};

const resizeCharts = () => {
  trendChart?.resize();
  healthRingChart?.resize();
  responseBarChart?.resize();
  statusMiniChart?.resize();
};

const goHealth = (taskId: string) => {
  router.push({ path: '/health', query: { taskId } });
};

const getSeverityType = (severity: string) => {
  const map: Record<string, 'info' | 'warning' | 'danger' | 'success'> = { info: 'info', warning: 'warning', error: 'danger', critical: 'danger' };
  return map[severity] || 'info';
};

const getSeverityText = (severity: string) => {
  const map: Record<string, string> = { info: '信息', warning: '警告', error: '错误', critical: '严重' };
  return map[severity] || severity;
};

const getLevelTagType = (level: string) => {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = { excellent: 'success', good: 'info', warning: 'warning', critical: 'danger' };
  return map[level] || 'info';
};

const getLevelText = (level: string) => {
  const map: Record<string, string> = { excellent: '优秀', good: '良好', warning: '预警', critical: '严重' };
  return map[level] || level;
};

const formatTime = (time: string) =>
  new Date(time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

onMounted(async () => {
  await loadDashboard();
  window.addEventListener('resize', resizeCharts);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  trendChart?.dispose();
  healthRingChart?.dispose();
  responseBarChart?.dispose();
  statusMiniChart?.dispose();
});
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-panel {
  position: relative;
  overflow: hidden;
  padding: 22px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 26%),
    radial-gradient(circle at left bottom, rgba(99, 102, 241, 0.16), transparent 32%),
    linear-gradient(145deg, #081120 0%, #0b1528 58%, #111e33 100%);
  color: #f8fafc;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
}

.hero-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
  background-size: 30px 30px;
  pointer-events: none;
}

.hero-head,
.metric-grid {
  position: relative;
  z-index: 1;
}

.hero-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.eyebrow {
  font-size: 11px;
  letter-spacing: 0.28em;
  color: #67e8f9;
}

.hero-title {
  margin: 8px 0 6px;
  font-size: 30px;
  line-height: 1.1;
}

.hero-subtitle {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.metric-tile {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(9, 15, 27, 0.76);
  backdrop-filter: blur(10px);
}

.tile-cyan {
  box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.08);
}

.tile-blue {
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.08);
}

.tile-orange {
  box-shadow: inset 0 0 0 1px rgba(251, 146, 60, 0.08);
}

.tile-violet {
  box-shadow: inset 0 0 0 1px rgba(129, 140, 248, 0.08);
}

.metric-label {
  color: #94a3b8;
  font-size: 13px;
}

.metric-value {
  margin-top: 10px;
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
}

.metric-foot {
  margin-top: 12px;
  color: #cbd5e1;
  font-size: 13px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.45fr 0.85fr;
  gap: 14px;
}

.dashboard-card {
  border-radius: 24px;
  border: 0;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.96) 0%, rgba(10, 16, 28, 0.98) 100%);
  color: #f8fafc;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
}

.chart-large {
  min-height: 430px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: #f8fafc;
  font-weight: 600;
}

.panel-meta {
  color: #64748b;
  font-size: 12px;
}

.chart-host {
  width: 100%;
}

.chart-host-large {
  height: 340px;
}

.chart-host-medium,
.chart-host-small {
  height: 260px;
}

.alert-list,
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-item,
.task-item {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(51, 65, 85, 0.85);
}

.task-item {
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.task-item:hover {
  transform: translateY(-2px);
  border-color: rgba(96, 165, 250, 0.55);
}

.alert-main,
.alert-side,
.task-score-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-title,
.task-name {
  font-size: 15px;
  font-weight: 600;
  color: #f8fafc;
}

.alert-message,
.task-help,
.alert-time {
  font-size: 12px;
  color: #94a3b8;
}

.task-score {
  text-align: right;
  font-size: 28px;
  font-weight: 700;
  color: #f8fafc;
}

.empty-state {
  padding: 24px 0;
  text-align: center;
  color: #64748b;
}

:deep(.dashboard-card .el-card__header) {
  padding: 16px 18px 0;
  border-bottom: 0;
}

:deep(.dashboard-card .el-card__body) {
  padding: 14px 18px 18px;
}

:deep(.hero-actions .el-select__wrapper) {
  background: rgba(15, 23, 42, 0.86);
  box-shadow: inset 0 0 0 1px rgba(71, 85, 105, 0.8);
}

:deep(.hero-actions .el-select__placeholder),
:deep(.hero-actions .el-select__selected-item) {
  color: #e2e8f0;
}

@media (max-width: 1280px) {
  .metric-grid,
  .dashboard-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .hero-head,
  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .metric-grid,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
