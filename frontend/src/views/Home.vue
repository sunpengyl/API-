<template>
  <div class="dashboard-page">
    <section class="dashboard-toolbar">
      <div class="toolbar-actions">
        <el-select v-model="timeRange" style="width: 160px" @change="loadDashboard">
          <el-option label="最近 1 小时" :value="1" />
          <el-option label="最近 6 小时" :value="6" />
          <el-option label="最近 24 小时" :value="24" />
          <el-option label="最近 7 天" :value="168" />
        </el-select>
        <el-button type="primary" :loading="loading" @click="loadDashboard">刷新看板</el-button>
      </div>
    </section>

    <section class="summary-grid">
      <div class="summary-card summary-card--inspect">
        <div class="summary-inspect__head">
          <div class="summary-inspect__left">
            <div class="summary-inspect__icon">
              <el-icon class="summary-inspect__icon-svg"><Document /></el-icon>
            </div>
            <div>
              <div class="summary-inspect__value">{{ summary.totalTasks }}</div>
              <div class="summary-inspect__title">今日巡检总数</div>
            </div>
          </div>
          <div class="summary-inspect__trend">
            <span class="summary-inspect__trend-arrow">↑</span>
            <span class="summary-inspect__trend-value">0.0%</span>
          </div>
        </div>
        <div class="summary-inspect__ticks"></div>
      </div>

      <div class="summary-card summary-card--success">
        <div class="summary-success__head">
          <div class="summary-success__left">
            <div class="summary-success__icon">
              <el-icon class="summary-success__icon-svg"><CircleCheck /></el-icon>
            </div>
            <div>
              <div class="summary-success__value">{{ summary.successRate }}%</div>
              <div class="summary-success__title">今日接口成功率</div>
            </div>
          </div>
          <div class="summary-success__trend">+0.0%</div>
        </div>
        <div class="summary-success__ticks"></div>
      </div>

      <div class="summary-card summary-card--alert">
        <div class="summary-alert__head">
          <div class="summary-alert__icon">
            <el-icon class="summary-alert__icon-svg"><WarningFilled /></el-icon>
          </div>
          <div class="summary-alert__content">
            <div class="summary-alert__title">告警汇总</div>
            <div class="summary-alert__status">
              <span class="summary-alert__status-primary">{{ summary.activeAlerts }} 警告中</span>
              <span class="summary-alert__status-dot"></span>
              <span class="summary-alert__status-secondary">已查看 {{ summary.historyAlerts }}</span>
            </div>
          </div>
        </div>
        <div class="summary-alert__breakdown">
          <div class="summary-alert__item">
            <span class="summary-chip summary-chip--warning"></span>
            <span class="summary-alert__item-value">{{ summary.warningAlerts }}</span>
            <span class="summary-alert__item-label">警告</span>
          </div>
          <div class="summary-alert__item">
            <span class="summary-chip summary-chip--danger"></span>
            <span class="summary-alert__item-value">{{ summary.errorAlerts }}</span>
            <span class="summary-alert__item-label">错误</span>
          </div>
          <div class="summary-alert__item">
            <span class="summary-chip summary-chip--critical"></span>
            <span class="summary-alert__item-value">{{ summary.criticalAlerts }}</span>
            <span class="summary-alert__item-label">严重</span>
          </div>
        </div>
      </div>

      <div class="summary-card summary-card--response">
        <div class="summary-response__value">
          <span class="summary-response__number">{{ summary.avgResponseTime }}</span>
          <span class="summary-response__unit">ms</span>
        </div>
        <div class="summary-response__title">平均响应时间</div>
        <div class="summary-response__breakdown">
          <div class="summary-response__item">
            <span class="summary-dot summary-dot--warning"></span>
            <span class="summary-response__item-value">{{ summary.excellentTasks }}</span>
            <span class="summary-response__item-label">优秀</span>
          </div>
          <div class="summary-response__item">
            <span class="summary-dot summary-dot--primary"></span>
            <span class="summary-response__item-value">{{ summary.goodTasks }}</span>
            <span class="summary-response__item-label">良好</span>
          </div>
          <div class="summary-response__item">
            <span class="summary-dot summary-dot--success"></span>
            <span class="summary-response__item-value">{{ summary.warningTasks }}</span>
            <span class="summary-response__item-label">预警</span>
          </div>
        </div>
      </div>
    </section>

    <section class="panel-grid">
      <el-card class="panel-card panel-wide" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>巡检任务状态</span>
            <span class="panel-tip">总任务 {{ summary.totalTasks }}</span>
          </div>
        </template>
        <div class="status-panel">
          <div ref="healthRingRef" class="chart-host chart-donut"></div>
          <div ref="trendChartRef" class="chart-host chart-line"></div>
        </div>
      </el-card>

      <el-card class="panel-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>巡检成功率趋势</span>
            <span class="panel-tip">{{ timeRangeLabel }}</span>
          </div>
        </template>
        <div ref="successTrendRef" class="chart-host chart-medium"></div>
      </el-card>

      <el-card class="panel-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>告警记录</span>
            <span class="panel-link">查看全部</span>
          </div>
        </template>
        <div class="list-table">
          <div class="table-head">
            <span>巡检任务</span>
            <span>严重级别</span>
            <span>触发时间</span>
          </div>
          <div v-for="alert in recentAlerts" :key="alert.id" class="table-row">
            <span>{{ alert.title }}</span>
            <span>
              <el-tag size="small" :type="getSeverityType(alert.severity)">
                {{ getSeverityText(alert.severity) }}
              </el-tag>
            </span>
            <span>{{ formatTime(alert.triggeredAt) }}</span>
          </div>
          <div v-if="recentAlerts.length === 0" class="table-empty">当前没有告警</div>
        </div>
      </el-card>

      <el-card class="panel-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>执行日志</span>
            <span class="panel-tip">最近执行</span>
          </div>
        </template>
        <div class="list-table">
          <div class="table-head">
            <span>执行时间</span>
            <span>巡检任务</span>
            <span>状态</span>
          </div>
          <div
            v-for="item in recentResults.slice(0, 5)"
            :key="`${item.taskId}-${item.executedAt}`"
            class="table-row"
          >
            <span>{{ formatTime(item.executedAt) }}</span>
            <span>{{ getTaskName(item.taskId) }}</span>
            <span>
              <el-tag size="small" :type="item.success ? 'success' : 'danger'">
                {{ item.success ? '成功' : '失败' }}
              </el-tag>
            </span>
          </div>
          <div v-if="recentResults.length === 0" class="table-empty">当前没有执行记录</div>
        </div>
      </el-card>

      <el-card class="panel-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>任务健康概览</span>
            <span class="panel-link">跳转健康页</span>
          </div>
        </template>
        <div class="list-table">
          <div class="table-head">
            <span>任务</span>
            <span>评分</span>
            <span>平均响应</span>
          </div>
          <div
            v-for="item in topHealthTasks.slice(0, 5)"
            :key="item.taskId"
            class="table-row row-clickable"
            @click="goHealth(item.taskId)"
          >
            <span>{{ item.taskName }}</span>
            <span>{{ item.score }}</span>
            <span>{{ item.avgResponseTime }}ms</span>
          </div>
          <div v-if="topHealthTasks.length === 0" class="table-empty">暂无健康度数据</div>
        </div>
      </el-card>

      <el-card class="panel-card panel-wide" shadow="never">
        <template #header>
          <div class="panel-header">
            <span>成功响应耗时分布</span>
            <span class="panel-tip">P50 / P95 / P99</span>
          </div>
        </template>
        <div class="bottom-grid">
          <div ref="responseBarRef" class="chart-host chart-bottom"></div>
          <div ref="percentileRef" class="chart-host chart-bottom"></div>
        </div>
      </el-card>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import {
  CircleCheck,
  Document,
  Timer,
  WarningFilled,
} from '@element-plus/icons-vue';
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
const searchText = ref('');

const tasks = ref<TaskItem[]>([]);
const healthOverview = ref<HealthOverviewItem[]>([]);
const recentResults = ref<HistoryItem[]>([]);
const activeAlerts = ref<AlertItem[]>([]);
const alertHistory = ref<AlertItem[]>([]);

const trendChartRef = ref<HTMLDivElement>();
const healthRingRef = ref<HTMLDivElement>();
const successTrendRef = ref<HTMLDivElement>();
const responseBarRef = ref<HTMLDivElement>();
const percentileRef = ref<HTMLDivElement>();

let trendChart: echarts.ECharts | null = null;
let healthRingChart: echarts.ECharts | null = null;
let successTrendChart: echarts.ECharts | null = null;
let responseBarChart: echarts.ECharts | null = null;
let percentileChart: echarts.ECharts | null = null;

const timeRangeLabel = computed(() => {
  const map: Record<number, string> = {
    1: '最近 1 小时',
    6: '最近 6 小时',
    24: '最近 24 小时',
    168: '最近 7 天',
  };
  return map[timeRange.value] || `${timeRange.value} 小时`;
});

const filteredResults = computed(() => {
  if (!searchText.value.trim()) return recentResults.value;

  const keyword = searchText.value.trim().toLowerCase();
  return recentResults.value.filter((item) => getTaskName(item.taskId).toLowerCase().includes(keyword));
});

const summary = computed(() => {
  const totalTasks = tasks.value.length;
  const enabledTasks = tasks.value.filter((item) => item.enabled !== false).length;
  const avgScore = healthOverview.value.length
    ? Math.round(
        healthOverview.value.reduce((sum, item) => sum + Number(item.score || 0), 0) /
          healthOverview.value.length
      )
    : 0;
  const avgResponseTime = filteredResults.value.length
    ? Math.round(
        filteredResults.value.reduce((sum, item) => sum + Number(item.responseTime || 0), 0) /
          filteredResults.value.length
      )
    : 0;
  const successCount = filteredResults.value.filter((item) => item.success).length;
  const successRate = filteredResults.value.length
    ? Math.round((successCount / filteredResults.value.length) * 1000) / 10
    : 0;

  const excellentTasks = healthOverview.value.filter((item) => item.level === 'excellent').length;
  const goodTasks = healthOverview.value.filter((item) => item.level === 'good').length;
  const warningTasks = healthOverview.value.filter((item) => item.level === 'warning').length;

  const warningAlerts = alertHistory.value.filter((item) => item.severity === 'warning').length;
  const errorAlerts = alertHistory.value.filter((item) => item.severity === 'error').length;
  const criticalAlerts = alertHistory.value.filter((item) => item.severity === 'critical').length;

  return {
    totalTasks,
    enabledTasks,
    avgScore,
    avgResponseTime,
    successRate,
    activeAlerts: activeAlerts.value.length,
    historyAlerts: alertHistory.value.length,
    healthyTasks: healthOverview.value.filter((item) => ['excellent', 'good'].includes(item.level))
      .length,
    excellentTasks,
    goodTasks,
    warningTasks,
    warningAlerts,
    errorAlerts,
    criticalAlerts,
  };
});

const topHealthTasks = computed(() => [...healthOverview.value].sort((a, b) => b.score - a.score));
const recentAlerts = computed(() => alertHistory.value.slice(0, 5));

const getHistoryRange = () => {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - timeRange.value * 60 * 60 * 1000);
  return { startTime: startTime.toISOString(), endTime: endTime.toISOString() };
};

const loadDashboard = async () => {
  loading.value = true;
  try {
    const range = getHistoryRange();
    const [tasksData, healthData, activeAlertsData, alertHistoryData, historyData] =
      await Promise.all([
        taskApi.getTasks(),
        healthApi.getAllTasksHealth(timeRange.value),
        alertApi.getActiveAlerts(),
        alertApi.getAlertHistory({
          page: 1,
          pageSize: 20,
          startTime: range.startTime,
          endTime: range.endTime,
        }),
        historyApi.queryHistory({
          page: 1,
          pageSize: 60,
          startTime: range.startTime,
          endTime: range.endTime,
        }),
      ]);

    tasks.value = Array.isArray(tasksData) ? (tasksData as TaskItem[]) : [];
    healthOverview.value = Array.isArray(healthData) ? (healthData as HealthOverviewItem[]) : [];
    activeAlerts.value = Array.isArray(activeAlertsData) ? (activeAlertsData as AlertItem[]) : [];
    alertHistory.value = Array.isArray((alertHistoryData as any)?.alerts)
      ? ((alertHistoryData as any).alerts as AlertItem[])
      : [];
    recentResults.value = Array.isArray((historyData as any)?.results)
      ? ((historyData as any).results as HistoryItem[])
      : [];

    await nextTick();
    renderCharts();
  } finally {
    loading.value = false;
  }
};

const renderCharts = () => {
  renderHealthRingChart();
  renderTrendChart();
  renderSuccessTrendChart();
  renderResponseBarChart();
  renderPercentileChart();
};

const renderHealthRingChart = () => {
  if (!healthRingRef.value) return;
  if (!healthRingChart) healthRingChart = echarts.init(healthRingRef.value);

  const levelMap: Record<string, number> = {
    excellent: 0,
    good: 0,
    warning: 0,
    critical: 0,
  };

  topHealthTasks.value.forEach((item) => {
    levelMap[item.level] = (levelMap[item.level] || 0) + 1;
  });

  healthRingChart.setOption({
    color: ['#36cfc9', '#5aa8ff', '#ffb938', '#ff6b6b'],
    tooltip: { trigger: 'item' },
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'middle',
      textStyle: { color: '#5b6b88' },
    },
    series: [
      {
        type: 'pie',
        radius: ['54%', '76%'],
        center: ['34%', '50%'],
        label: { show: false },
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

const renderTrendChart = () => {
  if (!trendChartRef.value) return;
  if (!trendChart) trendChart = echarts.init(trendChartRef.value);

  const points = filteredResults.value
    .slice()
    .sort((a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime())
    .slice(-12);

  trendChart.setOption({
    color: ['#4ba5ff', '#7ec8ff'],
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#7d8fb3' },
      data: ['健康评分', '成功率'],
    },
    grid: { top: 34, left: 20, right: 16, bottom: 18, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((item) =>
        new Date(item.executedAt).toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
        })
      ),
      axisLine: { lineStyle: { color: '#dce8ff' } },
      axisLabel: { color: '#8194b8' },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#8194b8' },
      splitLine: { lineStyle: { color: '#edf3ff' } },
    },
    series: [
      {
        name: '健康评分',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(75, 165, 255, 0.22)' },
            { offset: 1, color: 'rgba(75, 165, 255, 0.02)' },
          ]),
        },
        data: points.map(() => summary.value.avgScore),
      },
      {
        name: '成功率',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: points.map((item) => (item.success ? 100 : 0)),
      },
    ],
  });
};

const renderSuccessTrendChart = () => {
  if (!successTrendRef.value) return;
  if (!successTrendChart) successTrendChart = echarts.init(successTrendRef.value);

  const points = filteredResults.value
    .slice()
    .sort((a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime())
    .slice(-10);

  successTrendChart.setOption({
    color: ['#48a9ff'],
    tooltip: { trigger: 'axis' },
    grid: { top: 16, left: 18, right: 16, bottom: 18, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((item) =>
        new Date(item.executedAt).toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
        })
      ),
      axisLine: { lineStyle: { color: '#dce8ff' } },
      axisLabel: { color: '#8194b8' },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#8194b8' },
      splitLine: { lineStyle: { color: '#edf3ff' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(72, 169, 255, 0.26)' },
            { offset: 1, color: 'rgba(72, 169, 255, 0.04)' },
          ]),
        },
        data: points.map((item) => (item.success ? 100 : 0)),
      },
    ],
  });
};

const renderResponseBarChart = () => {
  if (!responseBarRef.value) return;
  if (!responseBarChart) responseBarChart = echarts.init(responseBarRef.value);

  const data = topHealthTasks.value.slice(0, 6).reverse();
  responseBarChart.setOption({
    color: ['#56b6ff'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 18, left: 16, right: 16, bottom: 12, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#8194b8' },
      splitLine: { lineStyle: { color: '#edf3ff' } },
    },
    yAxis: {
      type: 'category',
      data: data.map((item) => item.taskName),
      axisLabel: { color: '#5d7095' },
      axisLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        barWidth: 14,
        itemStyle: {
          borderRadius: 999,
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: '#6da8ff' },
            { offset: 1, color: '#49c6ff' },
          ]),
        },
        data: data.map((item) => item.avgResponseTime),
      },
    ],
  });
};

const renderPercentileChart = () => {
  if (!percentileRef.value) return;
  if (!percentileChart) percentileChart = echarts.init(percentileRef.value);

  const responseValues = filteredResults.value.map((item) => item.responseTime).sort((a, b) => a - b);
  const getPercentile = (ratio: number) => {
    if (responseValues.length === 0) return 0;
    const index = Math.min(responseValues.length - 1, Math.floor(responseValues.length * ratio));
    return responseValues[index];
  };

  const points = filteredResults.value
    .slice()
    .sort((a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime())
    .slice(-12);

  percentileChart.setOption({
    color: ['#4fa8ff', '#41d7c7', '#ffb938'],
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      left: 0,
      textStyle: { color: '#7386aa' },
      data: ['P50', 'P95', 'P99'],
    },
    grid: { top: 34, left: 16, right: 16, bottom: 16, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((item) =>
        new Date(item.executedAt).toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
        })
      ),
      axisLabel: { color: '#8194b8' },
      axisLine: { lineStyle: { color: '#dce8ff' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8194b8' },
      splitLine: { lineStyle: { color: '#edf3ff' } },
    },
    series: [
      {
        name: 'P50',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: points.map(() => getPercentile(0.5)),
      },
      {
        name: 'P95',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: points.map(() => getPercentile(0.95)),
      },
      {
        name: 'P99',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: points.map(() => getPercentile(0.99)),
      },
    ],
  });
};

const resizeCharts = () => {
  trendChart?.resize();
  healthRingChart?.resize();
  successTrendChart?.resize();
  responseBarChart?.resize();
  percentileChart?.resize();
};

const goHealth = (taskId: string) => {
  router.push({ path: '/health', query: { taskId } });
};

const getTaskName = (taskId: string) => {
  const task = tasks.value.find((item) => item.id === taskId);
  return task ? task.name : taskId;
};

const getSeverityType = (severity: string) => {
  const map: Record<string, 'info' | 'warning' | 'danger' | 'success'> = {
    info: 'info',
    warning: 'warning',
    error: 'danger',
    critical: 'danger',
  };
  return map[severity] || 'info';
};

const getSeverityText = (severity: string) => {
  const map: Record<string, string> = {
    info: '信息',
    warning: '警告',
    error: '错误',
    critical: '严重',
  };
  return map[severity] || severity;
};

const formatTime = (time: string) =>
  new Date(time).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

onMounted(async () => {
  await loadDashboard();
  window.addEventListener('resize', resizeCharts);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  trendChart?.dispose();
  healthRingChart?.dispose();
  successTrendChart?.dispose();
  responseBarChart?.dispose();
  percentileChart?.dispose();
});
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dashboard-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding: 0 0 6px;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.toolbar-actions .el-select {
  width: 160px;
  flex: 0 0 160px;
}

.toolbar-actions .el-select :deep(.el-input__wrapper),
.toolbar-actions .el-select :deep(.el-select__wrapper) {
  height: 40px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
}

.toolbar-actions .el-button {
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 24px;
  border-radius: 18px;
  color: #ffffff;
  box-shadow: 0 18px 32px rgba(70, 125, 220, 0.18);
}

.summary-card--inspect {
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  padding: 18px 18px 14px;
  color: #24385d;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  box-shadow: 0 14px 30px rgba(79, 121, 191, 0.12);
  border-left: 6px solid #4c83ff;
}

.summary-inspect__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
}

.summary-inspect__left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.summary-inspect__icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(76, 131, 255, 0.14);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 44px;
}

.summary-inspect__icon-svg {
  width: 22px;
  height: 22px;
  color: #4c83ff;
}

:deep(.summary-inspect__icon-svg svg) {
  width: 22px;
  height: 22px;
}

.summary-inspect__value {
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
}

.summary-inspect__title {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #4f6aa3;
}

.summary-inspect__trend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #4c83ff;
  white-space: nowrap;
}

.summary-inspect__trend-arrow {
  font-size: 16px;
  line-height: 1;
}

.summary-inspect__ticks {
  height: 20px;
  border-radius: 10px;
  background:
    repeating-linear-gradient(
      90deg,
      rgba(76, 131, 255, 0.18) 0,
      rgba(76, 131, 255, 0.18) 2px,
      transparent 2px,
      transparent 12px
    );
  opacity: 0.9;
}

.summary-card--success {
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  padding: 18px 18px 14px;
  color: #24385d;
  background: linear-gradient(180deg, #f7fffd 0%, #ffffff 100%);
  box-shadow: 0 14px 30px rgba(79, 121, 191, 0.12);
  border-left: 6px solid #22c55e;
}

.summary-success__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
}

.summary-success__left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.summary-success__icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 44px;
}

.summary-success__icon-svg {
  width: 22px;
  height: 22px;
  color: #22c55e;
}

:deep(.summary-success__icon-svg svg) {
  width: 22px;
  height: 22px;
}

.summary-success__value {
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
}

.summary-success__title {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #4f6aa3;
}

.summary-success__trend {
  font-size: 14px;
  font-weight: 800;
  color: #22c55e;
  white-space: nowrap;
}

.summary-success__ticks {
  height: 20px;
  border-radius: 10px;
  background:
    repeating-linear-gradient(
      90deg,
      rgba(34, 197, 94, 0.18) 0,
      rgba(34, 197, 94, 0.18) 2px,
      transparent 2px,
      transparent 12px
    );
  opacity: 0.9;
}

.card-blue {
  background: linear-gradient(135deg, #59a5ff 0%, #4c83ff 100%);
}

.card-green {
  background: linear-gradient(135deg, #39d1c4 0%, #56d39c 100%);
}

.card-orange {
  background: linear-gradient(135deg, #ffb52f 0%, #ff8f42 100%);
}

.card-red {
  background: linear-gradient(135deg, #ff6b79 0%, #ff5a7a 100%);
}

.summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 54px;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.summary-icon-blue {
  background: rgba(255, 255, 255, 0.16);
}

.summary-icon-green {
  background: rgba(255, 255, 255, 0.18);
}

.summary-icon-orange {
  background: rgba(255, 255, 255, 0.18);
}

.summary-icon-red {
  background: rgba(255, 255, 255, 0.18);
}

.summary-icon-svg {
  font-size: 24px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

:deep(.summary-icon-svg svg) {
  width: 24px;
  height: 24px;
}

.summary-value {
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
}

.summary-title {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 600;
}

.summary-meta {
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.92;
}

.summary-card--response {
  position: relative;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  color: #24385d;
  background: linear-gradient(180deg, #f3f6ff 0%, #ffffff 100%);
  box-shadow: 0 14px 30px rgba(79, 121, 191, 0.12);
  overflow: hidden;
}

.summary-card--response::before,
.summary-card--response::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.summary-card--response::before {
  top: -48px;
  right: -58px;
  width: 180px;
  height: 180px;
  background: rgba(90, 168, 255, 0.22);
}

.summary-card--response::after {
  top: 18px;
  right: -18px;
  width: 120px;
  height: 120px;
  background: rgba(90, 168, 255, 0.16);
}

.summary-response__value {
  display: flex;
  align-items: baseline;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.summary-response__number {
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
}

.summary-response__unit {
  font-size: 14px;
  font-weight: 600;
  color: #7f92b8;
}

.summary-response__title {
  font-size: 15px;
  font-weight: 700;
  color: #24385d;
  position: relative;
  z-index: 1;
}

.summary-response__breakdown {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.summary-response__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #52658c;
}

.summary-response__item-value {
  font-weight: 700;
  color: #24385d;
}

.summary-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
}

.summary-dot--warning {
  background: #f59e0b;
}

.summary-dot--primary {
  background: #60a5fa;
}

.summary-dot--success {
  background: #34d399;
}

.summary-card--alert {
  position: relative;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  color: #24385d;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  box-shadow: 0 14px 30px rgba(79, 121, 191, 0.10);
  overflow: hidden;
}

.summary-card--alert::before,
.summary-card--alert::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.summary-card--alert::before {
  top: -56px;
  right: -66px;
  width: 200px;
  height: 200px;
  background: rgba(245, 158, 11, 0.14);
}

.summary-card--alert::after {
  top: 22px;
  right: -18px;
  width: 130px;
  height: 130px;
  background: rgba(245, 158, 11, 0.10);
}

.summary-card--alert .summary-alert__head,
.summary-card--alert .summary-alert__breakdown {
  position: relative;
  z-index: 1;
}

.summary-alert__head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.summary-alert__icon {
  flex: 0 0 54px;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.summary-alert__icon-svg {
  width: 26px;
  height: 26px;
  color: #f59e0b;
}

:deep(.summary-alert__icon-svg svg) {
  width: 26px;
  height: 26px;
}

.summary-alert__content {
  flex: 1;
  min-width: 0;
}

.summary-alert__title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.2px;
}

.summary-alert__status {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.summary-alert__status-primary {
  color: #4f6aa3;
  font-weight: 700;
}

.summary-alert__status-secondary {
  color: #22c55e;
  font-weight: 700;
}

.summary-alert__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #cbd5e1;
}

.summary-alert__breakdown {
  margin-top: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.summary-alert__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #52658c;
}

.summary-alert__item-value {
  font-weight: 800;
  color: #24385d;
}

.summary-chip {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.summary-chip--warning {
  background: #fbbf24;
}

.summary-chip--danger {
  background: #fb7185;
}

.summary-chip--critical {
  background: #60a5fa;
}

.panel-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
}

.panel-card {
  border: 0;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 14px 30px rgba(79, 121, 191, 0.08);
}

.panel-wide {
  grid-column: span 2;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  color: #24385d;
  font-size: 15px;
  font-weight: 700;
}

.panel-tip,
.panel-link {
  color: #7f92b8;
  font-size: 13px;
  font-weight: 500;
}

.status-panel {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 18px;
  align-items: center;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 18px;
}

.chart-host {
  width: 100%;
}

.chart-donut,
.chart-line,
.chart-medium {
  height: 260px;
}

.chart-bottom {
  height: 220px;
}

.list-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 1.4fr 0.9fr 0.9fr;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
}

.table-head {
  background: #f5f9ff;
  color: #6880ab;
  font-size: 13px;
  font-weight: 600;
}

.table-row {
  color: #31476e;
  font-size: 14px;
  background: #fbfdff;
}

.row-clickable {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.row-clickable:hover {
  background: #f0f7ff;
}

.table-empty {
  padding: 28px 0;
  text-align: center;
  color: #8aa0c4;
  font-size: 14px;
}

:deep(.panel-card .el-card__header) {
  padding: 16px 18px 0;
  border-bottom: 0;
}

:deep(.panel-card .el-card__body) {
  padding: 14px 18px 18px;
}

@media (max-width: 1280px) {
  .summary-grid,
  .panel-grid,
  .status-panel,
  .bottom-grid {
    grid-template-columns: 1fr 1fr;
  }

  .panel-wide {
    grid-column: span 2;
  }
}

@media (max-width: 900px) {
  .dashboard-toolbar,
  .toolbar-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-grid,
  .panel-grid,
  .status-panel,
  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .panel-wide {
    grid-column: span 1;
  }
}
</style>
