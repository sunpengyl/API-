<template>
  <div class="health-container">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <div>
            <div class="page-title">健康度与监控分析</div>
            <div class="page-subtitle">查看评分、成功率与响应时间趋势</div>
          </div>
          <div class="header-actions">
            <el-select
              v-model="timeRange"
              style="width: 160px"
              @change="handleTimeRangeChange"
            >
              <el-option label="最近 1 小时" :value="1" />
              <el-option label="最近 6 小时" :value="6" />
              <el-option label="最近 24 小时" :value="24" />
              <el-option label="最近 7 天" :value="168" />
            </el-select>
            <el-button type="primary" :loading="overviewLoading" @click="loadData">
              刷新数据
            </el-button>
          </div>
        </div>
      </template>

      <el-skeleton :loading="overviewLoading" animated :rows="6">
        <div class="overview-grid">
          <el-card
            v-for="item in healthOverview"
            :key="item.taskId"
            shadow="hover"
            class="overview-item"
            :class="[`level-${item.level}`, { 'is-active': selectedTaskId === item.taskId }]"
            @click="selectTask(item.taskId)"
          >
            <div class="overview-accent"></div>
            <div class="overview-top">
              <div class="overview-title-group">
                <span class="overview-name">{{ item.taskName }}</span>
                <span class="overview-time">{{ formatTime(item.calculatedAt) }}</span>
              </div>
              <el-tag :type="getLevelTagType(item.level)" effect="light">
                {{ getLevelText(item.level) }}
              </el-tag>
            </div>

            <div class="overview-main">
              <div class="overview-score-block">
                <div class="overview-score-label">健康评分</div>
                <div class="overview-score">{{ item.score }}</div>
              </div>

              <div class="overview-stats">
                <div class="overview-stat">
                  <span class="overview-stat-label">成功率</span>
                  <span class="overview-stat-value">{{ item.successRate }}%</span>
                </div>
                <div class="overview-stat">
                  <span class="overview-stat-label">平均响应</span>
                  <span class="overview-stat-value">{{ item.avgResponseTime }}ms</span>
                </div>
                <div class="overview-stat">
                  <span class="overview-stat-label">校验通过</span>
                  <span class="overview-stat-value">{{ item.validationPassRate }}%</span>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </el-skeleton>

      <div class="toolbar">
        <el-select
          v-model="selectedTaskId"
          placeholder="选择任务查看详情"
          filterable
          style="width: 320px"
          @change="loadTaskDetails"
        >
          <el-option
            v-for="task in tasks"
            :key="task.id"
            :label="task.name"
            :value="task.id"
          />
        </el-select>
      </div>

      <div v-if="selectedTaskId" v-loading="detailLoading" class="details-section">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :lg="6">
            <el-card class="metric-card">
              <div class="metric-label">健康评分</div>
              <div class="metric-value">{{ taskHealth.score }}</div>
              <el-tag :type="getLevelTagType(taskHealth.level)">
                {{ getLevelText(taskHealth.level) }}
              </el-tag>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :lg="6">
            <el-card class="metric-card">
              <div class="metric-label">成功率</div>
              <div class="metric-value">{{ taskHealth.successRate }}%</div>
              <div class="metric-help">校验通过率 {{ taskHealth.validationPassRate }}%</div>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :lg="6">
            <el-card class="metric-card">
              <div class="metric-label">平均响应时间</div>
              <div class="metric-value">{{ stats.avg }}ms</div>
              <div class="metric-help">样本 {{ stats.count }} 次</div>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="12" :lg="6">
            <el-card class="metric-card">
              <div class="metric-label">极值范围</div>
              <div class="metric-value">{{ stats.min }} - {{ stats.max }}</div>
              <div class="metric-help">单位 ms</div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :xl="16">
            <el-card class="chart-card">
              <template #header>
                <div class="panel-title">多指标趋势</div>
              </template>
              <div ref="trendChartRef" class="chart-host"></div>
            </el-card>
          </el-col>

          <el-col :xs="24" :xl="8">
            <el-card class="chart-card">
              <template #header>
                <div class="panel-title">响应时间分位对比</div>
              </template>
              <div ref="percentileChartRef" class="chart-host chart-host-small"></div>
            </el-card>
          </el-col>
        </el-row>

        <el-card class="panel-card">
          <template #header>
            <div class="panel-title">健康评分历史</div>
          </template>
          <el-table :data="healthHistory" stripe>
            <el-table-column label="计算时间" min-width="180">
              <template #default="{ row }">
                {{ formatTime(row.calculatedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="评分" width="100" prop="score" />
            <el-table-column label="等级" width="120">
              <template #default="{ row }">
                <el-tag :type="getLevelTagType(row.level)">
                  {{ getLevelText(row.level) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="成功率" width="120">
              <template #default="{ row }">{{ row.successRate }}%</template>
            </el-table-column>
            <el-table-column label="平均响应" width="140">
              <template #default="{ row }">{{ row.avgResponseTime }}ms</template>
            </el-table-column>
            <el-table-column label="校验通过率" width="140">
              <template #default="{ row }">{{ row.validationPassRate }}%</template>
            </el-table-column>
            <el-table-column label="统计窗口" min-width="220">
              <template #default="{ row }">
                {{ formatTime(row.timeRangeStart) }} - {{ formatTime(row.timeRangeEnd) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import { healthApi } from '../api/health';
import { taskApi } from '../api/task';

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

interface TaskItem {
  id: string;
  name: string;
}

interface HealthDetail {
  score: number;
  level: string;
  successRate: number;
  avgResponseTime: number;
  validationPassRate: number;
}

interface ResponseTimeStats {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  count: number;
}

interface HealthHistoryItem {
  id: string;
  taskId: string;
  score: number;
  level: string;
  successRate: number;
  avgResponseTime: number;
  validationPassRate: number;
  calculatedAt: string;
  timeRangeStart: string;
  timeRangeEnd: string;
}

const tasks = ref<TaskItem[]>([]);
const healthOverview = ref<HealthOverviewItem[]>([]);
const selectedTaskId = ref('');
const timeRange = ref(24);
const overviewLoading = ref(false);
const detailLoading = ref(false);

const taskHealth = ref<HealthDetail>({
  score: 0,
  level: 'critical',
  successRate: 0,
  avgResponseTime: 0,
  validationPassRate: 0,
});

const stats = ref<ResponseTimeStats>({
  avg: 0,
  p50: 0,
  p95: 0,
  p99: 0,
  min: 0,
  max: 0,
  count: 0,
});

const healthHistory = ref<HealthHistoryItem[]>([]);
const trendChartRef = ref<HTMLDivElement>();
const percentileChartRef = ref<HTMLDivElement>();
let trendChart: echarts.ECharts | null = null;
let percentileChart: echarts.ECharts | null = null;

const getLevelText = (level: string) => {
  const map: Record<string, string> = {
    excellent: '优秀',
    good: '良好',
    warning: '预警',
    critical: '严重',
  };
  return map[level] || level;
};

const getLevelTagType = (level: string) => {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    excellent: 'success',
    good: '',
    warning: 'warning',
    critical: 'danger',
  };
  return map[level] || 'info';
};

const formatTime = (time: string | Date) => new Date(time).toLocaleString('zh-CN');

const getHistoryRangeParams = () => {
  const endTime = new Date(Date.now() + 60 * 1000);
  const startTime = new Date(endTime.getTime() - timeRange.value * 60 * 60 * 1000);
  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };
};

const selectTask = async (taskId: string) => {
  selectedTaskId.value = taskId;
  await loadTaskDetails();
};

const loadData = async () => {
  overviewLoading.value = true;
  try {
    const [tasksData, overviewData] = await Promise.all([
      taskApi.getTasks(),
      healthApi.getAllTasksHealth(timeRange.value),
    ]);

    tasks.value = Array.isArray(tasksData) ? (tasksData as TaskItem[]) : [];
    healthOverview.value = Array.isArray(overviewData) ? (overviewData as HealthOverviewItem[]) : [];

    if (!selectedTaskId.value && healthOverview.value.length > 0) {
      selectedTaskId.value = healthOverview.value[0].taskId;
    }

    if (!selectedTaskId.value && tasks.value.length > 0) {
      selectedTaskId.value = tasks.value[0].id;
    }

    if (selectedTaskId.value) {
      await loadTaskDetails();
    }
  } catch {
    ElMessage.error('加载健康度数据失败');
  } finally {
    overviewLoading.value = false;
  }
};

const loadTaskDetails = async () => {
  if (!selectedTaskId.value) {
    return;
  }

  detailLoading.value = true;
  try {
    const [healthData, statsData] = await Promise.all([
      healthApi.getTaskHealth(selectedTaskId.value, timeRange.value),
      healthApi.getResponseTimeStats(selectedTaskId.value, timeRange.value),
    ]);

    const historyParams = getHistoryRangeParams();
    const historyData = await healthApi.getHealthHistory(
      selectedTaskId.value,
      historyParams.startTime,
      historyParams.endTime
    );

    taskHealth.value = healthData as HealthDetail;
    stats.value = statsData as ResponseTimeStats;
    healthHistory.value = Array.isArray(historyData) ? (historyData as HealthHistoryItem[]) : [];

    const overviewIndex = healthOverview.value.findIndex((item) => item.taskId === selectedTaskId.value);
    if (overviewIndex >= 0) {
      healthOverview.value[overviewIndex] = {
        ...healthOverview.value[overviewIndex],
        score: taskHealth.value.score,
        level: taskHealth.value.level,
        successRate: taskHealth.value.successRate,
        avgResponseTime: taskHealth.value.avgResponseTime,
        validationPassRate: taskHealth.value.validationPassRate,
      };
    }

    await nextTick();
    renderCharts();
  } catch {
    ElMessage.error('加载任务健康详情失败');
  } finally {
    detailLoading.value = false;
  }
};

const renderCharts = () => {
  renderTrendChart();
  renderPercentileChart();
};

const renderTrendChart = () => {
  if (!trendChartRef.value) {
    return;
  }

  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value);
  }

  const history = [...healthHistory.value].reverse();
  const labels = history.map((item) =>
    new Date(item.calculatedAt).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  );

  trendChart.setOption({
    backgroundColor: 'transparent',
    color: ['#1d4ed8', '#059669', '#f97316'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      borderWidth: 0,
      textStyle: { color: '#f8fafc' },
    },
    legend: {
      top: 2,
      textStyle: { color: '#475569' },
      data: ['健康评分', '成功率', '平均响应时间'],
    },
    grid: {
      top: 42,
      left: 54,
      right: 58,
      bottom: 32,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: {
        color: '#64748b',
        margin: 10,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '评分 / 成功率',
        min: 0,
        max: 100,
        nameLocation: 'end',
        nameGap: 18,
        axisLabel: {
          color: '#64748b',
          margin: 10,
        },
        splitLine: { lineStyle: { color: '#e5e7eb' } },
      },
      {
        type: 'value',
        name: '响应时间(ms)',
        nameLocation: 'end',
        nameGap: 18,
        axisLabel: {
          color: '#64748b',
          margin: 10,
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '健康评分',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(29, 78, 216, 0.18)' },
            { offset: 1, color: 'rgba(29, 78, 216, 0.02)' },
          ]),
        },
        data: history.map((item) => item.score),
      },
      {
        name: '成功率',
        type: 'line',
        smooth: true,
        symbol: 'diamond',
        symbolSize: 7,
        lineStyle: {
          width: 2,
        },
        data: history.map((item) => item.successRate),
      },
      {
        name: '平均响应时间',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#f59e0b',
        },
        itemStyle: {
          color: '#f59e0b',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 158, 11, 0.16)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0.02)' },
          ]),
        },
        data: history.map((item) => item.avgResponseTime),
      },
    ],
  });
};

const renderPercentileChart = () => {
  if (!percentileChartRef.value) {
    return;
  }

  if (!percentileChart) {
    percentileChart = echarts.init(percentileChartRef.value);
  }

  const maxValue = Math.max(stats.value.max, 100) || 100;

  percentileChart.setOption({
    color: ['#0f766e'],
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ms',
    },
    radar: {
      radius: '62%',
      center: ['50%', '54%'],
      splitNumber: 4,
      axisName: { color: '#475569' },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.35)' } },
      splitArea: {
        areaStyle: {
          color: ['rgba(241, 245, 249, 0.45)', 'rgba(248, 250, 252, 0.75)'],
        },
      },
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.4)' } },
      indicator: [
        { name: '平均值', max: maxValue },
        { name: 'P50', max: maxValue },
        { name: 'P95', max: maxValue },
        { name: 'P99', max: maxValue },
      ],
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [stats.value.avg, stats.value.p50, stats.value.p95, stats.value.p99],
            name: '响应时间分布',
            areaStyle: { color: 'rgba(15, 118, 110, 0.22)' },
            lineStyle: { width: 2 },
            symbolSize: 6,
          },
        ],
      },
    ],
  });
};

const resizeCharts = () => {
  trendChart?.resize();
  percentileChart?.resize();
};

const handleTimeRangeChange = async () => {
  await loadData();
};

onMounted(() => {
  loadData();
  window.addEventListener('resize', resizeCharts);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  trendChart?.dispose();
  percentileChart?.dispose();
  trendChart = null;
  percentileChart = null;
});
</script>

<style scoped>
.health-container {
  padding: 2px;
}

.page-card {
  border-radius: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.page-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.overview-item {
  position: relative;
  cursor: pointer;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

:deep(.overview-item .el-card__body) {
  padding: 14px 16px 16px;
}

.overview-item:hover {
  transform: translateY(-3px);
  border-color: #cbd5e1;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
}

.overview-item.is-active {
  border-color: #2563eb;
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.14);
}

.overview-accent {
  position: absolute;
  left: 18px;
  right: 18px;
  top: 0;
  height: 3px;
  border-radius: 0 0 999px 999px;
  background: #cbd5e1;
}

.overview-item.level-excellent .overview-accent {
  background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%);
}

.overview-item.level-good .overview-accent {
  background: linear-gradient(90deg, #2563eb 0%, #60a5fa 100%);
}

.overview-item.level-warning .overview-accent {
  background: linear-gradient(90deg, #d97706 0%, #f59e0b 100%);
}

.overview-item.level-critical .overview-accent {
  background: linear-gradient(90deg, #dc2626 0%, #f87171 100%);
}

.overview-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.overview-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview-name {
  font-size: 13px;
  color: #0f172a;
  font-weight: 600;
}

.overview-time {
  font-size: 11px;
  color: #64748b;
}

.overview-main {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  align-items: flex-end;
}

.overview-score-block {
  min-width: 72px;
}

.overview-score-label {
  font-size: 11px;
  color: #64748b;
}

.overview-score {
  margin-top: 4px;
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(72px, auto));
  gap: 8px;
  flex: 1;
}

.overview-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f8fafc;
}

.overview-stat-label {
  font-size: 11px;
  color: #64748b;
}

.overview-stat-value {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-card,
.chart-card,
.panel-card {
  border-radius: 18px;
}

:deep(.chart-card .el-card__body) {
  padding: 8px 12px 12px;
}

.metric-card {
  min-height: 118px;
}

:deep(.metric-card .el-card__body) {
  padding: 16px 18px;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
}

.metric-value {
  margin: 10px 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}

.metric-help {
  font-size: 12px;
  color: #64748b;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.chart-host {
  width: 100%;
  height: 360px;
}

.chart-host-small {
  height: 360px;
}

@media (max-width: 768px) {
  .health-container {
    padding: 12px;
  }

  .card-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions :deep(.el-select) {
    width: 100% !important;
  }

  .overview-main {
    flex-direction: column;
    align-items: stretch;
  }

  .overview-stats {
    grid-template-columns: 1fr;
  }

  .chart-host,
  .chart-host-small {
    height: 300px;
  }
}
</style>
